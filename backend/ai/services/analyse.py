"""Analyse IA d'une annonce (US5.3 incohérences, US5.4 analyse auto, US5.6 score qualité).

Approche règles + modèle F6 (pas de LLM payant, cf. ROADMAP §risques) :
- incohérences entre le texte de l'annonce, les caractéristiques et les photos ;
- score de qualité 0-100 avec points forts / axes d'amélioration ;
- estimation du prix F6 + signal F7 (« potentiellement inhabituel », jamais « fraude »).

L'analyse est déclenchée automatiquement à la soumission (US5.4 MUST).
"""
from __future__ import annotations

import re

from ml.services.price import ModeleAbsent, estimer
from ml.training.scan_f7 import MESSAGE as MESSAGE_ANOMALIE

# --- Règles d'incohérence texte/caractéristiques/photos (US5.3) -------------

# (code, message, gravite) — gravite : 'moyenne' | 'faible'
INCOHERENCES_REGLES = [
    ('chambres_texte', 'Le nombre de chambres mentionné dans la description '
                       'ne correspond pas aux caractéristiques.', 'moyenne'),
    ('surface_texte', 'La surface indiquée dans la description diffère de la '
                      'surface déclarée.', 'moyenne'),
    ('meuble_texte', 'Le texte et la case « meublé » se contredisent.', 'moyenne'),
    ('prix_hors_norme', 'Le prix semble inhabituel par rapport aux logements '
                        'similaires — vérification recommandée.', 'moyenne'),
    ('photos_absentes', 'Aucune photo : les annonces avec photos sont '
                        'consultées beaucoup plus souvent.', 'faible'),
    ('description_courte', 'Description trop courte pour rassurer un '
                           'locataire.', 'faible'),
    ('equipements_peu', 'Peu d’équipements renseignés.', 'faible'),
]

# --- Règles de qualité (US5.6) ---------------------------------------------


def _extraire_nombre(texte: str, mot: str) -> int | None:
    """« 3 chambres » / « trois chambres » → 3 (si mentionné près du mot)."""
    m = re.search(rf'(\d+)\s*{mot}', texte, re.IGNORECASE)
    if m:
        return int(m.group(1))
    mots = {'un': 1, 'une': 1, 'deux': 2, 'trois': 3, 'quatre': 4,
            'cinq': 5, 'six': 6}
    m = re.search(r'\b(' + '|'.join(mots) + r')\s*' + mot, texte, re.IGNORECASE)
    return mots[m.group(1).lower()] if m else None


def detecter_incoherences(logement) -> tuple[list[dict], dict | None]:
    """US5.3 : contrôle texte ↔ caractéristiques ↔ photos. Jamais accusateur."""
    incoh: list[dict] = []
    desc = (logement.description or '').lower()
    titre = (logement.titre or '').lower()
    tout = f'{titre} {desc}'

    def ajouter(code, gravite):
        msg = next((m for c, m, g in INCOHERENCES_REGLES if c == code), code)
        incoh.append({'code': code, 'message': msg, 'gravite': gravite})

    # Chambres : « 3 chambres » dans le texte vs champ chambres
    n = _extraire_nombre(tout, r'chambres?')
    if n is not None and n != logement.chambres:
        ajouter('chambres_texte', 'moyenne')

    # Surface : « 70 m2 » dans le texte vs champ surface
    m = re.search(r'(\d{2,3})\s*m(?:2|²)', tout)
    if m and abs(int(m.group(1)) - logement.surface) > 5:
        ajouter('surface_texte', 'moyenne')

    # Meublé contradictoire
    mention_meuble = re.search(r'\bmeuble', tout) is not None
    mention_non_meuble = re.search(r'\bnon\s+meuble|sans\s+meuble', tout) is not None
    if mention_non_meuble and logement.meuble:
        ajouter('meuble_texte', 'moyenne')
    elif mention_meuble and not mention_non_meuble and not logement.meuble:
        ajouter('meuble_texte', 'moyenne')

    # Prix inhabituel (F6) — signal, jamais « fraude »
    anomalie = _verifier_prix(logement)
    if anomalie:
        ajouter('prix_hors_norme', 'moyenne')

    # Qualité du contenu
    if logement.photos.count() == 0:
        ajouter('photos_absentes', 'faible')
    if len(desc) < 80:
        ajouter('description_courte', 'faible')
    if logement.equipements.count() < 2:
        ajouter('equipements_peu', 'faible')

    return incoh, anomalie


def _verifier_prix(logement) -> dict | None:
    """F7 pour UNE annonce : écart au prix prédit au-delà du seuil → signal."""
    try:
        res = estimer({
            'ville': logement.ville, 'type': logement.type,
            'etat': logement.etat, 'meuble': logement.meuble,
            'surface': logement.surface, 'chambres': logement.chambres,
            'sdb': logement.sdb,
            'nb_equipements': logement.equipements.count(),
            'age_annonces_ville': 30.0,
        })
    except ModeleAbsent:
        return None
    prix_estime = res['prix_estime']
    ecart_pct = 100 * (logement.prix - prix_estime) / max(prix_estime, 1)
    if abs(ecart_pct) > 50:  # matérialité (cf. scan_f7.SEUIL_PCT)
        return {
            'prix_estime': int(prix_estime),
            'ecart_pct': round(ecart_pct, 1),
            'message': MESSAGE_ANOMALIE,
        }
    return None


def scorer_qualite(logement, incoherences: list[dict]) -> dict:
    """US5.6 : score qualité 0-100 + points forts / axes d'amélioration."""
    points = 0
    forts: list[str] = []
    faibles: list[str] = []

    # Description (30 pts)
    desc = logement.description or ''
    if len(desc) >= 200:
        points += 30
        forts.append('Description détaillée')
    elif len(desc) >= 80:
        points += 18
        forts.append('Description correcte')
    else:
        faibles.append('Allongez la description (au-delà de 200 caractères)')

    # Photos (25 pts)
    n_photos = logement.photos.count()
    if n_photos >= 3:
        points += 25
        forts.append(f'{n_photos} photos publiées')
    elif n_photos >= 1:
        points += 15
        forts.append('Photos présentes')
    else:
        faibles.append('Ajoutez au moins 3 photos')

    # Caractéristiques complètes (20 pts)
    complets = sum([bool(logement.quartier), bool(logement.disponible_de),
                    logement.surface > 0, logement.prix > 0])
    points += 5 * complets
    if complets == 4:
        forts.append('Caractéristiques complètes')

    # Équipements (15 pts)
    n_eq = logement.equipements.count()
    if n_eq >= 5:
        points += 15
        forts.append(f'{n_eq} équipements listés')
    elif n_eq >= 2:
        points += 9
    else:
        faibles.append('Listez davantage d’équipements (clim, wifi, parking…)')

    # Pénalité incohérences (10 pts max)
    gravite_pts = {'moyenne': 5, 'faible': 2}
    penalite = sum(gravite_pts.get(i['gravite'], 0) for i in incoherences)
    if penalite:
        faibles.append('Corrigez les incohérences signalées')
    points = max(0, points - min(10, penalite))

    return {'score_qualite': points, 'points_forts': forts,
            'points_faibles': faibles}


def analyser_annonce(logement) -> dict:
    """Analyse complète (F6 + F7 + incohérences + qualité) → payload AnnonceAnalyse."""
    incoherences, anomalie = detecter_incoherences(logement)
    qualite = scorer_qualite(logement, incoherences)
    return {
        'prix_estime': anomalie['prix_estime'] if anomalie else _prix_estime(logement),
        'flag_anomalie': bool(anomalie),
        'message_anomalie': anomalie['message'] if anomalie else '',
        'incoherences': incoherences,
        **qualite,
        'modele_version': 'F6-v1-regles-v1',
    }


def _prix_estime(logement) -> int | None:
    try:
        return int(estimer({
            'ville': logement.ville, 'type': logement.type,
            'etat': logement.etat, 'meuble': logement.meuble,
            'surface': logement.surface, 'chambres': logement.chambres,
            'sdb': logement.sdb,
            'nb_equipements': logement.equipements.count(),
            'age_annonces_ville': 30.0,
        })['prix_estime'])
    except ModeleAbsent:
        return None
