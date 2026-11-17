"""Dataset F6 : annonces réelles (DB) + données synthétiques réalistes (Tunisie).

Le synthétique suit une loi de prix explicite (prix/m² par ville × surface ×
multiplicateurs) avec du bruit — le modèle doit la réapprendre, ce qui permet
de valider MAE/R² de façon reproductible sans données externes.
"""
from __future__ import annotations

import random

import pandas as pd

# Prix au m² typiques (DT/mois) par ville — ordre de grandeur tunisien
PRIX_M2 = {
    'Tunis': 12, 'Ariana': 10, 'La Marsa': 15, 'Sfax': 7, 'Sousse': 9,
    'Monastir': 8, 'Bizerte': 7, 'Gabès': 6, 'Nabeul': 8, 'Djerba': 14,
}
TYPES = ['appartement', 'maison', 'chambre']
ETATS = ['neuf', 'bon', 'a_renover']
MULT_TYPE = {'appartement': 1.0, 'maison': 1.15, 'chambre': 0.55}
MULT_ETAT = {'neuf': 1.15, 'bon': 1.0, 'a_renover': 0.85}

TYPES_LOGEMENT = TYPES
EQUIPEMENTS_PMOYENS = ['Wifi', 'Climatisation', 'Parking', 'Ascenseur', 'Meublé',
                       'Machine à laver', 'Balcon', 'Chauffage', 'Gardiennage', 'TV']


def generer(n: int = 2500, seed: int = 42) -> pd.DataFrame:
    """Génère n logements synthétiques avec prix = loi explicite + bruit ~8 %."""
    rng = random.Random(seed)
    lignes = []
    for _ in range(n):
        ville = rng.choice(list(PRIX_M2))
        type_ = rng.choice(TYPES)
        etat = rng.choice(ETATS)
        surface = rng.randint(20, 220)
        chambres = max(1, surface // 35)
        sdb = max(1, chambres // 2)
        meuble = rng.random() > 0.5
        nb_eq = rng.randint(0, len(EQUIPEMENTS_PMOYENS))

        prix_base = surface * PRIX_M2[ville] * MULT_TYPE[type_] * MULT_ETAT[etat]
        prix_base *= 1.12 if meuble else 1.0
        prix_base *= 1 + 0.02 * nb_eq          # +2 % par équipement
        prix_base *= 1 + 0.04 * max(0, chambres - 2)  # surprime grandes familles
        prix_base *= rng.gauss(1.0, 0.08)      # bruit 8 %

        lignes.append({
            'ville': ville, 'type': type_, 'etat': etat, 'meuble': bool(meuble),
            'surface': surface, 'chambres': chambres, 'sdb': sdb,
            'nb_equipements': nb_eq, 'age_annonces_ville': round(rng.uniform(0, 120), 1),
            'prix': max(150, round(prix_base)),
        })
    return pd.DataFrame(lignes)


def depuis_db() -> pd.DataFrame:
    """Exporte les annonces actives de la DB vers le même format."""
    from listings.models import Logement

    rows = []
    qs = Logement.objects.filter(statut=Logement.Statut.ACTIF).prefetch_related('equipements')
    for log in qs:
        rows.append({
            'ville': log.ville, 'type': log.type, 'etat': log.etat, 'meuble': bool(log.meuble),
            'surface': log.surface, 'chambres': log.chambres, 'sdb': log.sdb,
            'nb_equipements': log.equipements.count(),
            'age_annonces_ville': 30.0,
            'prix': log.prix,
        })
    cols = ['ville', 'type', 'etat', 'meuble', 'surface', 'chambres', 'sdb',
            'nb_equipements', 'age_annonces_ville', 'prix']
    if not rows:
        return pd.DataFrame(columns=cols)
    return pd.DataFrame(rows)


def dataset_complet(n_synth: int = 2500, seed: int = 42) -> pd.DataFrame:
    """Synthétique + réel concaténés."""
    synth = generer(n_synth, seed=seed)
    reel = depuis_db()
    if reel.empty:
        return synth
    return pd.concat([reel, synth], ignore_index=True)
