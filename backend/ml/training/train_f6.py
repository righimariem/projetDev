"""Entraînement F6 : estimation de prix avec LightGBM (Pipeline sklearn).

Sorties : ml/models/prix.joblib + prix_meta.json (métriques, features).
Critères du plan : MAE < 12 % du prix médian, R² > 0.7 sur le jeu de test.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from lightgbm import LGBMRegressor
from sklearn.compose import ColumnTransformer, TransformedTargetRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

DOSSIER_DEFAUT = Path(__file__).resolve().parent.parent / 'models'


def dossier_modele() -> Path:
    """Dossier des modèles — surchargeable via HOMEY_MODELE_DIR (tests)."""
    return Path(os.environ.get('HOMEY_MODELE_DIR', DOSSIER_DEFAUT))


def chemin_modele() -> Path:
    return dossier_modele() / 'prix.joblib'


def chemin_meta() -> Path:
    return dossier_modele() / 'prix_meta.json'

FEATURES_CAT = ['ville', 'type', 'etat', 'meuble']
FEATURES_NUM = ['surface', 'chambres', 'sdb', 'nb_equipements', 'age_annonces_ville']
CIBLE = 'prix'


def construire_features(df: pd.DataFrame) -> pd.DataFrame:
    """Features dérivées communes à l'entraînement et à la prédiction."""
    out = df.copy()
    out['meuble'] = out['meuble'].astype(int)
    out['nb_equipements'] = out.get('nb_equipements', 0)
    if 'age_annonces_ville' not in out.columns:
        out['age_annonces_ville'] = 0.0
    return out[FEATURES_CAT + FEATURES_NUM]


def entrainer(df: pd.DataFrame, test_size: float = 0.2, seed: int = 42) -> dict:
    """Entraîne le modèle et retourne les métriques. df doit contenir toutes les features + prix."""
    X = construire_features(df)
    y = df[CIBLE]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=seed
    )

    preproc = ColumnTransformer([
        ('cat', OneHotEncoder(handle_unknown='ignore'), FEATURES_CAT),
        ('num', 'passthrough', FEATURES_NUM),
    ])

    modele = TransformedTargetRegressor(
        # Cible logarithmique : évite le biais de régression vers la moyenne
        # sur les grands biens (faux positifs F7 sur les villas chères).
        regressor=Pipeline([
            ('prep', preproc),
            ('lgbm', LGBMRegressor(
                n_estimators=300, learning_rate=0.05, num_leaves=31,
                random_state=seed, verbose=-1,
            )),
        ]),
        func=np.log1p,
        inverse_func=np.expm1,
    )
    modele.fit(X_train, y_train)

    pred = modele.predict(X_test)
    mae = float(mean_absolute_error(y_test, pred))
    rmse = float(mean_squared_error(y_test, pred) ** 0.5)
    r2 = float(r2_score(y_test, pred))
    prix_median = float(y.median())

    meta = {
        'version': datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S'),
        'entraine_le': datetime.now(timezone.utc).isoformat(),
        'n_echantillons': int(len(df)),
        'n_test': int(len(X_test)),
        'mae': round(mae, 2),
        'rmse': round(rmse, 2),
        'r2': round(r2, 4),
        'prix_median': round(prix_median, 2),
        'mae_pct_median': round(100 * mae / prix_median, 2) if prix_median else None,
        'cible': CIBLE,
        'features_cat': FEATURES_CAT,
        'features_num': FEATURES_NUM,
    }

    dossier_modele().mkdir(parents=True, exist_ok=True)
    joblib.dump(modele, chemin_modele())
    chemin_meta().write_text(
        json.dumps(meta, indent=2, ensure_ascii=False), encoding='utf-8'
    )
    return meta


def accepte(meta: dict) -> bool:
    """Validation des critères du plan : MAE < 12 % du médian et R² > 0.7."""
    return (
        meta.get('mae_pct_median') is not None
        and meta['mae_pct_median'] < 12
        and meta.get('r2', 0) > 0.7
    )
