"""Service F6 : chargement du modèle et estimation de prix."""
from __future__ import annotations

import json
from functools import lru_cache

import pandas as pd

from ml.training.train_f6 import chemin_meta, chemin_modele, construire_features


class ModeleAbsent(Exception):
    """Le modèle n'est pas encore entraîné (lancer `manage.py train_prix`)."""


@lru_cache(maxsize=2)
def _charger():
    if not chemin_modele().exists():
        raise ModeleAbsent(
            "Modèle d'estimation absent : lancez `manage.py train_prix`."
        )
    import joblib

    modele = joblib.load(chemin_modele())
    meta = (
        json.loads(chemin_meta().read_text(encoding='utf-8'))
        if chemin_meta().exists() else {}
    )
    return modele, meta


def invalider_cache():
    """À appeler après un ré-entraînement."""
    _charger.cache_clear()


def estimer(caracteristiques: dict) -> dict:
    """Estime le prix d'un logement à partir de ses caractéristiques.

    Entrée (minimale) : {ville, type, surface, chambres, sdb, meuble, etat,
    nb_equipements, age_annonces_ville}
    Sortie : {prix_estime, intervalle_bas, intervalle_haut, metriques}
    """
    modele, meta = _charger()
    df = pd.DataFrame([caracteristiques])
    prix = float(modele.predict(construire_features(df))[0])
    prix = max(prix, 0)

    # Fourchette = ±1 écart-type résiduel approximé depuis RMSE du modèle
    marge = meta.get('rmse', prix * 0.15)
    return {
        'prix_estime': round(prix),
        'intervalle_bas': round(max(0, prix - marge)),
        'intervalle_haut': round(prix + marge),
        'metriques': {
            'mae': meta.get('mae'),
            'r2': meta.get('r2'),
            'mae_pct_median': meta.get('mae_pct_median'),
            'version': meta.get('version'),
        },
    }
