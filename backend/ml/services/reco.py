"""Moteur de recommandation F2 + explications F8.

Approche cold-start (contenu) : score pondéré = somme des compatibilités
par critère entre le profil du locataire et l'annonce. Chaque critère
produit une explication F8 : « Pourquoi ce logement ? ».

Poids réglables ici (cf. ROADMAP §F2 reco_weights).
"""
from __future__ import annotations

from dataclasses import dataclass, field

from django.db.models import Prefetch

from listings.models import Equipement, Logement

# Poids des critères (total = 100 points)
POIDS = {
    'budget': 30,
    'ville': 15,
    'chambres': 12,
    'surface': 10,
    'equipements': 13,
    'disponibilite': 10,
    'type': 5,
    'meuble': 5,
}


@dataclass
class Explication:
    critere: str
    points: int
    total: int
    raison: str

    @property
    def satisfait(self) -> bool:
        return self.points >= self.total * 0.9

    def as_dict(self) -> dict:
        return {
            'critere': self.critere,
            'points': self.points,
            'points_max': self.total,
            'satisfait': self.satisfait,
            'raison': self.raison,
        }


@dataclass
class Recommandation:
    logement: Logement
    score: int
    explications: list[Explication] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            'logement': self.logement,
            'score': self.score,
            'explications': [e.as_dict() for e in self.explications],
            'explications_fortes': [
                e.raison for e in self.explications if e.satisfait and e.points > 0
            ],
        }


def _score_budget(prix: int, profil) -> tuple[int, str]:
    total = POIDS['budget']
    bmin, bmax = profil.budget_min, profil.budget_max
    if bmin is None and bmax is None:
        return total, 'Budget non défini — annonce prise telle quelle'
    if bmax and bmin:
        if bmin <= prix <= bmax:
            return total, f'{prix} DT dans votre budget ({bmin}–{bmax} DT)'
        # pénalité proportionnelle à l'écart hors fourchette
        ecart = min(abs(prix - bmin), abs(prix - bmax))
        piste = max(0, 1 - ecart / max(bmax, 1))
        return round(total * piste), f'{prix} DT proche de votre budget ({bmin}–{bmax} DT)'
    if bmax and prix <= bmax:
        return total, f'{prix} DT ≤ votre budget max ({bmax} DT)'
    if bmax:
        ecart = prix - bmax
        return round(total * max(0, 1 - ecart / max(bmax, 1))), \
            f'{prix} DT dépasse votre budget max ({bmax} DT)'
    # bmin seulement
    if prix >= bmin:
        return total, f'{prix} DT ≥ votre budget min ({bmin} DT)'
    return round(total * max(0, 1 - (bmin - prix) / max(bmin, 1))), \
        f'{prix} DT sous votre budget min ({bmin} DT)'


def _score_ville(ville: str, profil) -> tuple[int, str]:
    total = POIDS['ville']
    if not profil.ville:
        return total, 'Aucune ville préférée — pas de contrainte de localisation'
    if ville.lower() == profil.ville.lower():
        return total, f'À {ville}, la localisation recherchée'
    return 0, f'À {ville} (vous cherchez {profil.ville})'


def _score_chambres(chambres: int, profil) -> tuple[int, str]:
    total = POIDS['chambres']
    req = profil.chambres_souhaitees
    if not req:
        return total, 'Nombre de chambres sans contrainte'
    if chambres >= req:
        return total, f'{chambres} chambres (≥ {req} demandées)'
    return round(total * max(0, 1 - (req - chambres) / max(req, 1))), \
        f'{chambres} chambres seulement ({req} demandées)'


def _score_surface(surface: int, profil) -> tuple[int, str]:
    total = POIDS['surface']
    smin = profil.surface_min
    if not smin:
        return total, 'Surface sans contrainte'
    if surface >= smin:
        return total, f'{surface} m² ≥ {smin} m² souhaités'
    return round(total * max(0, 1 - (smin - surface) / max(smin, 1))), \
        f'{surface} m² ({smin} m² souhaités)'


def _score_equipements(logement: Logement, profils_equips: set[str]) -> tuple[int, str]:
    total = POIDS['equipements']
    if not profils_equips:
        return total, 'Aucun équipement exigé'
    possedes = {e.lower() for e in logement.equipements.values_list('nom', flat=True)}
    voulus = {e.lower() for e in profils_equips}
    n = len(voulus & possedes)
    if n == len(voulus):
        return total, 'Tous les équipements recherchés présents'
    if n == 0:
        return 0, f'Équipements recherchés absents ({", ".join(sorted(voulus))})'
    return round(total * n / len(voulus)), \
        f'{n}/{len(voulus)} équipements recherchés présents'


def _score_dispo(logement: Logement, profil) -> tuple[int, str]:
    total = POIDS['disponibilite']
    if not profil.disponibilite:
        return total, 'Date de disponibilité sans contrainte'
    if logement.disponible_de and logement.disponible_de <= profil.disponibilite:
        return total, f'Disponible au {logement.disponible_de:%d/%m/%Y} (votre date)'
    if not logement.disponible_de:
        return round(total * 0.7), 'Disponibilité non précisée dans l’annonce'
    return 0, f'Disponible seulement au {logement.disponible_de:%d/%m/%Y}'


def _score_type_meuble(logement: Logement, profil) -> list[tuple[str, int, str, int]]:
    """Retourne [(critere, points, raison, total)] pour type et meublé."""
    res = []
    res.append(('Type', POIDS['type'], f'Type : {logement.get_type_display()}', POIDS['type']))
    total = POIDS['meuble']
    if profil.mode_recherche and logement.meuble:
        res.append(('Meublé', total, 'Meublé comme souhaité', total))
    elif not profil.mode_recherche:
        res.append(('Meublé', total, 'Meublé indifférent', total))
    else:
        res.append(('Meublé', 0 if logement.meuble else total,
                    'Meublé' if logement.meuble else 'Non meublé', total))
    return res


def recommander(profil, logements=None, limit: int = 10) -> list[Recommandation]:
    """F2 : top-K des logements pour le profil, avec explications F8.

    Profil = ProfilLocataire (préférences F1/F3).
    """
    if logements is None:
        logements = (
            Logement.objects
            .filter(statut=Logement.Statut.ACTIF)
            .prefetch_related(Prefetch('equipements', queryset=Equipement.objects.all()))
        )

    # Équipements souhaités par le locataire (libre texte séparé par des virgules)
    voulus: set[str] = set()
    raw = getattr(profil, 'equipements_desires', '') or ''
    for mot in raw.split(','):
        if mot.strip():
            voulus.add(mot.strip())

    resultats: list[Recommandation] = []
    for log in logements:
        explications: list[Explication] = []
        points = 0

        p, raison = _score_budget(log.prix, profil)
        explications.append(Explication('Budget', p, POIDS['budget'], raison))
        points += p
        p, raison = _score_ville(log.ville, profil)
        explications.append(Explication('Localisation', p, POIDS['ville'], raison))
        points += p
        p, raison = _score_chambres(log.chambres, profil)
        explications.append(Explication('Chambres', p, POIDS['chambres'], raison))
        points += p
        p, raison = _score_surface(log.surface, profil)
        explications.append(Explication('Surface', p, POIDS['surface'], raison))
        points += p
        p, raison = _score_equipements(log, voulus)
        explications.append(Explication('Équipements', p, POIDS['equipements'], raison))
        points += p
        p, raison = _score_dispo(log, profil)
        explications.append(Explication('Disponibilité', p, POIDS['disponibilite'], raison))
        points += p
        for critere, p, raison, total in _score_type_meuble(log, profil):
            explications.append(Explication(critere, p, total, raison))
            points += p

        resultats.append(Recommandation(logement=log, score=min(100, points),
                                        explications=explications))

    resultats.sort(key=lambda r: (-r.score, r.logement.prix))
    return resultats[:limit]
