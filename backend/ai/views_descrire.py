"""US5.1 — Description assistée par IA.

Génère un brouillon de description à partir des caractéristiques saisies
(par templates structurés — pas de LLM payant, cf. ROADMAP §risques ;
une intégration LLM reste possible en gardant ce contrat d'API).
"""
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from listings.models import Logement

PHRASES_ETAT = {
    'neuf': "Le logement est neuf et n'a jamais été habité.",
    'bon': "Le logement est en bon état et prêt à être habité.",
    'a_renover': "Le logement est à rénover, ce qui explique son prix attractif.",
}


def _phrase_intro(logement) -> str:
    ville = logement.ville
    quartier = logement.quartier or None
    if logement.type == Logement.Type.CHAMBRE:
        base = f"Chambre {('à ' + quartier + ', ') if quartier else ('à ' + ville)}"
        return base + f"disponible à la location pour {logement.prix} DT/mois."
    lieu = f"{quartier}, {ville}" if quartier else ville
    return (
        f"{logement.get_type_display()} de {logement.surface} m² à {lieu}, "
        f"proposé {logement.prix} DT/mois."
    )


def _phrase_caracteristiques(logement) -> str:
    bits = [
        f"{logement.chambres} chambre{'s' if logement.chambres > 1 else ''}",
        f"{logement.sdb} salle{'s' if logement.sdb > 1 else ''} de bain",
        'meublé' if logement.meuble else 'non meublé',
    ]
    return 'Il dispose de ' + ', '.join(bits) + '.'


def _phrase_equipements(noms: list[str]) -> str | None:
    if not noms:
        return None
    if len(noms) == 1:
        return f"Équipement : {noms[0].lower()}."
    return 'Équipements : ' + ', '.join(n.lower() for n in noms[:-1]) + \
        f' et {noms[-1].lower()}.'


def generer_description(logement, equipements: list[str] | None = None) -> str:
    """US5.1 : brouillon éditable par le propriétaire."""
    if equipements is None:
        equipements = list(logement.equipements.values_list('nom', flat=True))
    paragraphes = [_phrase_intro(logement), _phrase_caracteristiques(logement)]
    dispo = (
        f"Disponible à partir du {logement.disponible_de:%d/%m/%Y}."
        if logement.disponible_de else None
    )
    equip = _phrase_equipements(equipements)
    etat = PHRASES_ETAT.get(logement.etat)
    for p in (dispo, equip, etat):
        if p:
            paragraphes.append(p)
    return '\n\n'.join(paragraphes)


class DescriptionAssisteeView(APIView):
    """POST /describe-listing/ — US5.1 : suggère une description (propriétaire).

    Payload : caractéristiques du formulaire (ville, surface, chambres…).
    Si `logement` est fourni et appartient à l'utilisateur, l'annonce existante
    sert de base (pas de saisie en double).
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'ai'

    def post(self, request):
        if not request.user.is_proprietaire:
            return Response(
                {'detail': 'La description assistée est réservée aux propriétaires.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        logement_id = request.data.get('logement')
        equipements_req = request.data.get('equipements')  # liste de noms

        if logement_id:
            logement = Logement.objects.filter(pk=logement_id).first()
            if not logement or logement.proprietaire != request.user:
                return Response({'detail': 'Annonce non accessible.'},
                                status=status.HTTP_404_NOT_FOUND)
        else:
            # Annonce volatille à partir du formulaire (pas encore en base)
            d = request.data
            surface = d.get('surface')
            if not surface or int(surface) <= 0:
                return Response({'surface': 'Surface obligatoire et positive.'},
                                status=status.HTTP_400_BAD_REQUEST)
            logement = Logement(
                proprietaire=request.user,
                type=d.get('type', Logement.Type.APPARTEMENT),
                titre=d.get('titre', 'Logement'),
                ville=d.get('ville', 'Tunis'),
                quartier=d.get('quartier', ''),
                surface=int(surface),
                chambres=int(d.get('chambres', 1)),
                sdb=int(d.get('sdb', 1)),
                prix=int(d.get('prix', 0)),
                meuble=d.get('meuble') in (True, 'true', 'True', '1'),
                etat=d.get('etat', Logement.Etat.BON),
            )

        noms = equipements_req if isinstance(equipements_req, list) else None
        description = generer_description(logement, noms)
        return Response({
            'description': description,
            'editeable': True,
            'note': 'Brouillon généré à partir des caractéristiques — '
                    'relisez et adaptez-le avant publication.',
        })
