"""Moteurs Sprint 5 — F4 (matching client↔client) et F5 (groupe → logement).

F4 : compatibilité entre deux profils de locataires, score 0–100 avec détail
par critère (US7.3, US7.4) — explications F8 transversales.

F5 : `profil_de_groupe()` combine les besoins des membres (budget additionné
selon le cahier des charges : 450 + 500 = 950 DT, localisation/chambres
intersectés) pour réutiliser le recommandeur F2 avec explications.
"""
from __future__ import annotations

from dataclasses import dataclass, field

# Poids F4 (total = 100 points)
POIDS_F4 = {
    'budget': 20,
    'localisation': 15,
    'disponibilite': 10,
    'fumeur': 15,
    'animaux': 10,
    'proprete': 8,
    'bruit': 7,
    'horaires': 5,
    'visiteurs': 5,
    'habitudes': 5,
}


@dataclass
class ExplicationF4:
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
class Compatibilite:
    score: int
    explications: list[ExplicationF4] = field(default_factory=list)

    @property
    def communs(self) -> list[str]:
        return [e.raison for e in self.explications if e.satisfait and e.points > 0]

    @property
    def divergents(self) -> list[str]:
        return [e.raison for e in self.explications if not e.satisfait]

    def as_dict(self) -> dict:
        return {
            'score': self.score,
            'explications': [e.as_dict() for e in self.explications],
            'critères_communs': self.communs,
            'critères_divergents': self.divergents,
        }


def _s_budget(pa, pb) -> tuple[int, str]:
    total = POIDS_F4['budget']
    amax, bmax = pa.budget_max, pb.budget_max
    if not amax or not bmax:
        return total, 'Budget non renseigné — pas de contrainte'
    # Budgets proches = charges d'un même logement supportables ensemble
    ecart = abs(amax - bmax)
    plafond = max(amax, bmax)
    ratio = max(0, 1 - ecart / plafond)
    return round(total * ratio), f'Budgets {amax} DT et {bmax} DT ({ecart} DT d’écart)'


def _s_boolean(ok: bool, total: int, oui: str, non: str) -> tuple[int, str]:
    if ok:
        return total, oui
    return 0, non


def _s_ecart(v_a: int, v_b: int, total: int, libelle: str) -> tuple[int, str]:
    """1–5 : pénalité proportionnelle à l'écart."""
    ecart = abs(v_a - v_b)
    if ecart == 0:
        return total, f'{libelle} identique (niveau {v_a})'
    if ecart == 1:
        return round(total * 0.6), f'{libelle} proche ({v_a} vs {v_b})'
    return round(total * max(0, 1 - ecart / 4)), f'{libelle} différent ({v_a} vs {v_b})'


def compatibilite(pa, pb) -> Compatibilite:
    """F4 : score 0–100 entre deux ProfilLocataire + détail par critère (F8)."""
    explications: list[ExplicationF4] = []
    points = 0

    # Libellés affichés → clés de POIDS_F4
    _cles = {
        'Budget': 'budget', 'Localisation': 'localisation', 'Disponibilité': 'disponibilite',
        'Tabagisme': 'fumeur', 'Animaux': 'animaux', 'Propreté': 'proprete', 'Bruit': 'bruit',
        'Horaires': 'horaires', 'Visiteurs': 'visiteurs', 'Habitudes': 'habitudes',
    }

    def add(critere: str, resultat: tuple[int, str]):
        nonlocal points
        p, raison = resultat
        explications.append(ExplicationF4(critere, p, POIDS_F4[_cles[critere]], raison))
        points += p

    add('Budget', _s_budget(pa, pb))

    # Localisation : mêmes villes recherchées
    total = POIDS_F4['localisation']
    if not pa.ville or not pb.ville:
        add('Localisation', (total, 'Aucune ville imposée'))
    elif pa.ville.lower() == pb.ville.lower():
        add('Localisation', (total, f'Tous deux cherchent à {pa.ville}'))
    else:
        add('Localisation', (0, f'{pa.ville} vs {pb.ville}'))

    # Disponibilité : même mois ou ±30 jours
    total = POIDS_F4['disponibilite']
    if not pa.disponibilite or not pb.disponibilite:
        add('Disponibilité', (total, 'Date de disponibilité libre'))
    else:
        ecart = abs((pa.disponibilite - pb.disponibilite).days)
        if ecart <= 7:
            add('Disponibilité', (total, f'Même période (écart {ecart} j)'))
        elif ecart <= 30:
            add('Disponibilité', (round(total * 0.6), f'Périodes proches (écart {ecart} j)'))
        else:
            add('Disponibilité', (0, f'Périodes éloignées (écart {ecart} j)'))

    add('Tabagisme', _s_boolean(
        pa.fumeur == pb.fumeur, POIDS_F4['fumeur'],
        'Non-fumeurs tous deux' if not pa.fumeur else 'Fumeurs tous deux',
        f'{"Fumeur" if pb.fumeur else "Non-fumeur"} vs {"fumeur" if pa.fumeur else "non-fumeur"}',
    ))
    add('Animaux', _s_boolean(
        pa.animaux == pb.animaux, POIDS_F4['animaux'],
        'Animaux acceptés des deux côtés' if pa.animaux else 'Aucun animal des deux côtés',
        'Un accepte les animaux, l’autre non',
    ))
    add('Propreté', _s_ecart(pa.niveau_proprete, pb.niveau_proprete, POIDS_F4['proprete'], 'Exigence de propreté'))
    add('Bruit', _s_ecart(pa.niveau_bruit, pb.niveau_bruit, POIDS_F4['bruit'], 'Tolérance au bruit'))

    # Horaires
    total = POIDS_F4['horaires']
    if pa.horaires == pb.horaires:
        add('Horaires', (total, f'Même rythme : {pa.get_horaires_display()}'))
    else:
        add('Horaires', (round(total * 0.4),
                         f'{pa.get_horaires_display()} vs {pb.get_horaires_display()}'))

    # Visiteurs : texte libre → tokens partagés
    total = POIDS_F4['visiteurs']
    va = {m.strip().lower() for m in (pa.visiteurs or '').split(',') if m.strip()}
    vb = {m.strip().lower() for m in (pb.visiteurs or '').split(',') if m.strip()}
    if not va or not vb:
        add('Visiteurs', (total, 'Fréquence des visiteurs non imposée'))
    elif va == vb:
        add('Visiteurs', (total, f'Fréquence identique : {", ".join(sorted(va))}'))
    elif va & vb:
        add('Visiteurs', (round(total * 0.5), 'Préférences de visiteurs partiellement alignées'))
    else:
        add('Visiteurs', (0, 'Préférences de visiteurs opposées'))

    # Habitudes : recouvrement des mots-clés déclarés
    total = POIDS_F4['habitudes']
    ha = {m.strip().lower() for m in (pa.habitudes or '').replace('.', ',').split(',') if m.strip()}
    hb = {m.strip().lower() for m in (pb.habitudes or '').replace('.', ',').split(',') if m.strip()}
    if not ha or not hb:
        add('Habitudes', (round(total * 0.5), 'Habitudes de vie non encore décrites'))
    else:
        n = len(ha & hb)
        if n:
            add('Habitudes', (round(total * n / len(ha | hb)),
                              f'Habitudes communes : {", ".join(sorted(ha & hb))}'))
        else:
            add('Habitudes', (0, 'Aucune habitude de vie commune déclarée'))

    return Compatibilite(score=min(100, points), explications=explications)


def suggestions_de_colocataires(profil, candidats, deja_proposes: set[int] | None = None):
    """F4 : tous les candidats compatibles triés par score décroissant.

    `candidats` = iterable de (user, profil_locataire).
    """
    deja_proposes = deja_proposes or set()
    resultats = []
    for user, p in candidats:
        if user.id == profil.user_id or user.id in deja_proposes:
            continue
        if p is None:
            continue
        comp = compatibilite(profil, p)
        resultats.append((user, comp))
    resultats.sort(key=lambda t: -t[1].score)
    return resultats


# ---------- F5 : profil combiné d'un groupe ----------

class ProfilGroupe:
    """Profil synthétique compatible avec le recommandeur F2 (attributs de ProfilLocataire)."""

    def __init__(self, **attributs):
        self.__dict__.update(attributs)


def profil_de_groupe(membres) -> tuple[ProfilGroupe, dict]:
    """F5 : combine les profils des membres d'un groupe (US8.4).

    - budget_max : somme des budgets (450 + 500 = 950 DT, cf. cahier des charges F5)
    - ville / chambres / surface : le besoin le plus exigeant (intersection)
    - équipements : intersection des équipements désirés
    Renvoie (profil, faits) où `faits` décrit la combinaison pour l'explication F8.
    """
    profils = [m.user.profil_locataire for m in membres]
    if not profils:
        raise ValueError('Groupe sans membre')

    budget_total = sum(p.budget_max or 0 for p in profils)
    villes = {p.ville.strip().lower() for p in profils if p.ville}
    ville = next(iter(villes)) if len(villes) == 1 else ''
    chambres = max([p.chambres_souhaitees for p in profils if p.chambres_souhaitees] or [None])
    surface = max([p.surface_min for p in profils if p.surface_min] or [None])

    equips: set[str] | None = None
    for p in profils:
        actuels = {m.strip() for m in (p.equipements_desires or '').split(',') if m.strip()}
        equips = actuels if equips is None else (equips & actuels)

    profil = ProfilGroupe(
        budget_min=None,
        budget_max=budget_total or None,
        ville=ville,
        quartier='',
        chambres_souhaitees=chambres,
        surface_min=surface,
        disponibilite=None,
        equipements_desires=', '.join(sorted(equips)) if equips else '',
        mode_recherche='coloc',
    )
    faits = {
        'budget_total': budget_total,
        'nb_membres': len(profils),
        'ville': ville or 'Indifférente',
        'chambres': chambres,
        'budgets_individuels': [p.budget_max for p in profils],
    }
    return profil, faits
