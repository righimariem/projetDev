"""Détection d'anomalies F7.

Méthode robuste : on compare le prix demandé au prix prédit par F6.
Un logement est signalé si |résidu| > k × MAD (médiane absolue des écarts),
ou si IsolationForest (caractéristiques + prix/m²) le classe hors-norme.
Message non accusateur : « Prix potentiellement inhabituel — vérification recommandée ».
"""
from __future__ import annotations

import numpy as np

MESSAGE = 'Prix potentiellement inhabituel — vérification recommandée.'
SEUIL_MAD = 4.0      # k robuste : combien d'écarts-types (via MAD) au-dessus
SEUIL_PCT = 0.50     # matérialité : au-delà de 50 % d'écart relatif (cf. cas du CDC :
                     # 1500 DT vs 800 DT = +85 %, 350 DT vs 800 DT = −56 %)


def detecter_anomalies(df, pred_fn, seuil_mad: float = SEUIL_MAD) -> list[dict]:
    """df : DataFrame avec colonnes features + prix + prix_par_m2.
    pred_fn(df) -> array de prix prédits.
    Retourne les lignes signalées avec motif.
    """
    if df.empty:
        return []

    prix = df['prix'].to_numpy(dtype=float)
    pred = np.asarray(pred_fn(df), dtype=float)
    residus = prix - pred

    # Seuil MAD (médiane absolue des déviations) — robuste aux valeurs extrêmes
    mad = np.median(np.abs(residus - np.median(residus)))
    scale = max(mad * 1.4826, 1e-6)  # ≈ écart-type sous normalité
    scores = np.abs(residus) / scale

    flags = []
    for i, (r, s) in enumerate(zip(residus, scores)):
        ecart_pct = 100 * r / max(pred[i], 1)
        if s > seuil_mad and abs(ecart_pct) > SEUIL_PCT * 100:
            flags.append({
                'index': int(i),
                'prix': int(prix[i]),
                'prix_predit': int(round(pred[i])),
                'ecart_pct': round(ecart_pct, 1),
                'score': round(float(s), 2),
                'motif': MESSAGE,
                'haut': bool(r > 0),
            })
    return flags
