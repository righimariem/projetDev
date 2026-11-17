"""US6.1 — Recherche en langage naturel.

Extrait des critères structurés F1 depuis une phrase en français
(« un appartement meublé à Ariana moins de 900 DT avec clim »).

Approche : règles + lexiques (pas de LLM payant — cf. ROADMAP risques,
mitigation « LLM optionnel, ou règles »). Chaque critère extrait renvoie
son explication pour que l'utilisateur voie comment sa phrase a été comprise.
"""
from __future__ import annotations

import re
import unicodedata

# --- Lexiques ---------------------------------------------------------------

VILLES = [
    'Tunis', 'Ariana', 'La Marsa', 'Marsa', 'Sfax', 'Sousse', 'Monastir',
    'Bizerte', 'Gabès', 'Nabeul', 'Djerba', 'Ben Arous', 'La Goulette',
    'Ennasr', 'Mégrine', 'Rades', 'Hammamet', 'Kairouan', 'Gafsa',
]

# synonyme → nom d'équipement tel que stocké en base
EQUIPEMENTS = {
    'clim': 'Climatisation', 'climatisation': 'Climatisation',
    'wifi': 'Wifi', 'wi-fi': 'Wifi', 'internet': 'Wifi',
    'parking': 'Parking', 'garage': 'Parking',
    'ascenseur': 'Ascenseur',
    'lave-linge': 'Lave-linge', 'lave linge': 'Lave-linge',
    'lave-vaisselle': 'Lave-vaisselle', 'lave vaisselle': 'Lave-vaisselle',
    'balcon': 'Balcon', 'jardin': 'Jardin', 'piscine': 'Piscine',
    'television': 'Television', 'télévision': 'Television', 'tv': 'Television',
}

TYPES = {
    'appartement': 'appartement', 'appart': 'appartement',
    'maison': 'maison', 'villa': 'maison',
    'chambre': 'chambre', 'studio': 'chambre',
}


# --- Utilitaires ------------------------------------------------------------

def _sans_accents(texte: str) -> str:
    return ''.join(
        c for c in unicodedata.normalize('NFD', texte)
        if unicodedata.category(c) != 'Mn'
    ).lower()


def _contient(texte: str, *mots: str) -> bool:
    """Mot entier insensible aux accents/casse (« à Ariana, » ne matche pas…)."""
    return re.search(r'\b(?:' + '|'.join(re.escape(m) for m in mots) + r')\b', texte) is not None


# --- Extraction -------------------------------------------------------------

def extraire_criteres(question: str) -> dict:
    """Retourne {filtres: dict, explications: [{critere, valeur, source}]}.

    `filtres` est directement utilisable par LogementFilter (F1).
    """
    brut = question or ''
    texte = _sans_accents(brut)
    filtres: dict = {}
    explications: list[dict] = []

    def ajouter(critere, valeur, source):
        filtres.setdefault(critere, valeur)
        explications.append({'critere': critere, 'valeur': valeur, 'source': source})

    # Ville — match sur la phrase entière, sans accent ni casse
    texte_sans_accents_complet = _sans_accents(brut)
    for ville in sorted(VILLES, key=len, reverse=True):
        if _sans_accents(ville) in texte_sans_accents_complet:
            ajouter('ville', ville, f'« {ville} » identifiée comme ville')
            break

    # Type de logement
    for mot, valeur in TYPES.items():
        if _contient(texte, mot):
            ajouter('type', valeur, f'« {mot} » identifié comme type de logement')
            break

    # Budget : « moins de 900 DT », « max 900 », « budget 900 », « 900 DT »
    m = re.search(
        r'(?:moins de|maximum|max|budget de|budget|max\.?)\s*(\d{2,5})\s*(?:dt|dinars?)?',
        texte,
    )
    if not m:
        m = re.search(r'(\d{2,5})\s*(?:dt|dinars?)\b', texte)
    if m:
        ajouter('prix_max', int(m.group(1)), f'« {m.group(0).strip()} » → budget maximal')

    # Surface : « 60 m2 », « surface de 60 »
    m = re.search(r'(\d{2,3})\s*m(?:2|²|carres?)', texte)
    if m:
        ajouter('surface_min', int(m.group(1)), f'« {m.group(0)} » → surface minimale')

    # Chambres : « 2 chambres », « 3 pièces »
    m = re.search(r'(\d)\s*(?:chambres?|pieces?)', texte)
    if m:
        ajouter('chambres_min', int(m.group(1)), f'« {m.group(0)} » → nombre de chambres')

    # Meublé / non meublé
    if _contient(texte, 'non meuble', 'sans meuble'):
        ajouter('meuble', False, '« non meublé » → annonce non meublée')
    elif _contient(texte, 'meuble', 'meubles'):
        ajouter('meuble', True, '« meublé » → annonce meublée')

    # Équipements (tous exigés, comme le filtre F1)
    trouves = [
        nom for syn, nom in EQUIPEMENTS.items() if _contient(texte, syn)
    ]
    if trouves:
        uniques = sorted(set(trouves), key=str.lower)
        ajouter('equipements', ','.join(uniques),
                f'Équipements détectés : {", ".join(uniques)}')

    # Disponibilité : « disponible en septembre », « dès septembre »
    m = re.search(
        r'(?:disponible|disponibilite|des|a partir de)\s*(?:en|le)?\s*'
        r'(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)'
        r'(?:\s+(\d{4}))?',
        texte,
    )
    if m:
        mois = {
            'janvier': 1, 'fevrier': 2, 'mars': 3, 'avril': 4, 'mai': 5,
            'juin': 6, 'juillet': 7, 'aout': 8, 'septembre': 9,
            'octobre': 10, 'novembre': 11, 'decembre': 12,
        }[m.group(1)]
        annee = int(m.group(2)) if m.group(2) else 2026
        ajouter('disponible_a', f'{annee}-{mois:02d}-01',
                f'« {m.group(0)} » → disponible à partir du {mois:02d}/{annee}')

    # quartier si mentionné (« Lac 2 », « Centre Urbain Nord »…)
    m = re.search(r'\b(lac\s*\d|centre urbain nord|etten\d?)\b', texte)
    if m and 'quartier' not in filtres:
        ajouter('quartier', m.group(1).strip(), f'« {m.group(0)} » → quartier')

    return {'filtres': filtres, 'explications': explications}
