"""Vues Sprint 5 — F3 (profil), F4 (matching), groupes (EPIC 8), F5 (reco groupe)."""
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import ProfilLocataire
from listings.serializers import LogementSerializer
from messaging.models import Notification
from ml.services.reco import recommander

from .models import GroupeColoc, MembreGroupe, PropositionMatching
from .serializers import (
    ColocProfilSerializer,
    GroupeColocSerializer,
    PropositionSerializer,
    ResumeLocataireSerializer,
)
from .services import compatibilite, profil_de_groupe, suggestions_de_colocataires

User = get_user_model()


def _profil_de(user):
    return ProfilLocataire.objects.filter(user=user).first()


def notifier(user, type_notif, titre, corps='', lien=''):
    """Crée une notification (US9.4) pour l'utilisateur."""
    Notification.objects.create(user=user, type=type_notif, titre=titre, corps=corps, lien=lien)


# ---------- F3 : préférences de colocation ----------

class PrefColocView(APIView):
    """GET/PATCH /colocation/prefs — critères de colocation F3 (US7.2).

    Stockés sur ProfilLocataire (champs « Critères colocation (F3) ») et
    exposés par l'API unifiée /me/preferences/ ; vue dédiée pour le mode
    de recherche seul/coloc/indécis (US7.1).
    """

    permission_classes = [permissions.IsAuthenticated]

    def _check_locataire(self, request):
        if request.user.role != User.Role.LOCATAIRE:
            return Response({'detail': 'Réservé aux comptes locataires.'}, status=403)
        return None

    def get(self, request):
        refus = self._check_locataire(request)
        if refus:
            return refus
        profil, _ = ProfilLocataire.objects.get_or_create(user=request.user)
        return Response(ColocProfilSerializer(profil).data)

    def patch(self, request):
        refus = self._check_locataire(request)
        if refus:
            return refus
        profil, _ = ProfilLocataire.objects.get_or_create(user=request.user)
        ser = ColocProfilSerializer(profil, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)


# ---------- F4 : suggestions + propositions ----------

class SuggestionsColocView(APIView):
    """GET /colocation/suggestions — colocataires compatibles triés par score (US7.3).

    Chaque suggestion porte son score 0–100 ET son détail par critère (US7.4, F8).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role != User.Role.LOCATAIRE:
            return Response({'detail': 'Réservé aux comptes locataires.'}, status=403)
        profil, _ = ProfilLocataire.objects.get_or_create(user=request.user)
        candidats = (
            User.objects
            .filter(role=User.Role.LOCATAIRE, is_suspended=False)
            .exclude(pk=request.user.pk)
            .select_related('profil_locataire')
        )
        deja = set(
            PropositionMatching.objects
            .filter(expediteur=request.user)
            .values_list('destinataire_id', flat=True)
        )
        resultats = suggestions_de_colocataires(
            profil,
            ((u, u.profil_locataire) for u in candidats if hasattr(u, 'profil_locataire')),
            deja_proposes=deja,
        )

        data = []
        for user, comp in resultats:
            data.append({
                'profil': ResumeLocataireSerializer(user).data,
                'coloc': ColocProfilSerializer(user.profil_locataire).data,
                'score': comp.score,
                'explications': [e.as_dict() for e in comp.explications],
                'critères_communs': comp.communs,
                'critères_divergents': comp.divergents,
            })
        return Response({'count': len(data), 'suggestions': data})


class PropositionsColocView(APIView):
    """GET : mes propositions (envoyées + reçues). POST : envoie une proposition (US7.5)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = PropositionMatching.objects.filter(
            Q(expediteur=request.user) | Q(destinataire=request.user)
        ).select_related('expediteur', 'destinataire', 'groupe')
        return Response(PropositionSerializer(qs, many=True).data)

    def post(self, request):
        destinataire_id = request.data.get('destinataire_id')
        if not destinataire_id:
            return Response({'detail': 'destinataire_id requis.'}, status=400)
        cible = generics.get_object_or_404(User, pk=destinataire_id, role=User.Role.LOCATAIRE)
        if cible.pk == request.user.pk:
            return Response({'detail': 'Impossible de se proposer à soi-même.'}, status=400)

        profil = _profil_de(request.user)
        profil_cible = _profil_de(cible)
        if profil is None or profil_cible is None:
            return Response({'detail': 'Profil locataire manquant.'}, status=400)

        comp = compatibilite(profil, profil_cible)
        prop, created = PropositionMatching.objects.get_or_create(
            expediteur=request.user, destinataire=cible,
            defaults={'score': comp.score,
                      'explications': [e.as_dict() for e in comp.explications]},
        )
        if not created:
            if prop.statut == PropositionMatching.Statut.REFUSEE:
                prop.statut = PropositionMatching.Statut.EN_ATTENTE
                prop.score = comp.score
                prop.explications = [e.as_dict() for e in comp.explications]
                prop.save(update_fields=['statut', 'score', 'explications'])
                notifier(cible, Notification.Type.MATCHING,
                         f'Nouvelle proposition de {request.user.first_name or request.user.username}',
                         f'Score de compatibilité : {comp.score} %', '/colocation')
            return Response(PropositionSerializer(prop).data, status=200)
        notifier(cible, Notification.Type.MATCHING,
                 f'Nouvelle proposition de {request.user.first_name or request.user.username}',
                 f'Score de compatibilité : {comp.score} %', '/colocation')
        return Response(PropositionSerializer(prop).data, status=201)


class RepondrePropositionView(APIView):
    """POST /colocation/propositions/{id}/repondre — accepter | refuser (US7.5).

    Acceptation → création du groupe réunissant les deux profils
    (acceptation mutuelle → groupe, critère F4 du cahier des charges).
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        prop = generics.get_object_or_404(PropositionMatching, pk=pk)
        if prop.destinataire_id != request.user.pk:
            return Response({'detail': 'Seul le destinataire peut répondre.'}, status=403)
        if prop.statut != PropositionMatching.Statut.EN_ATTENTE:
            return Response({'detail': 'Proposition déjà traitée.'}, status=400)

        action = request.data.get('action')
        if action == 'refuser':
            prop.statut = PropositionMatching.Statut.REFUSEE
            prop.repondu_at = timezone.now()
            prop.save(update_fields=['statut', 'repondu_at'])
            return Response(PropositionSerializer(prop).data)
        if action != 'accepter':
            return Response({'detail': 'action doit valoir accepter ou refuser.'}, status=400)

        groupe, _ = GroupeColoc.objects.get_or_create(
            cree_par=prop.expediteur,
            nom=f'Colocation {prop.expediteur.first_name or prop.expediteur.username} '
                f'& {prop.destinataire.first_name or prop.destinataire.username}',
        )
        for u in (prop.expediteur, prop.destinataire):
            MembreGroupe.objects.get_or_create(groupe=groupe, user=u)
        prop.statut = PropositionMatching.Statut.ACCEPTEE
        prop.groupe = groupe
        prop.repondu_at = timezone.now()
        prop.save(update_fields=['statut', 'groupe', 'repondu_at'])
        notifier(prop.expediteur, Notification.Type.MATCHING,
                 f'{prop.destinataire.first_name or prop.destinataire.username} a accepté votre proposition',
                 f'Vous formez le groupe « {groupe.nom} ».', f'/groupes/{groupe.pk}')
        return Response(PropositionSerializer(prop).data)


# ---------- Groupes (EPIC 8) ----------

class MesGroupesView(APIView):
    """GET : groupes dont je suis membre. POST : créer un groupe (US8.1)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        groupes = (GroupeColoc.objects
                   .filter(membres__user=request.user, membres__statut=MembreGroupe.Statut.MEMBRE)
                   .prefetch_related('membres__user', 'membres__user__profil_locataire')
                   .distinct())
        return Response(GroupeColocSerializer(groupes, many=True).data)

    def post(self, request):
        nom = (request.data.get('nom') or 'Notre colocation').strip()[:120]
        groupe = GroupeColoc.objects.create(nom=nom, cree_par=request.user)
        MembreGroupe.objects.create(groupe=groupe, user=request.user)
        return Response(GroupeColocSerializer(groupe).data, status=201)


class GroupeDetailView(APIView):
    """GET : détail d'un groupe. DELETE : dissoudre (créateur, US8.5)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        groupe = generics.get_object_or_404(GroupeColoc, pk=pk)
        if not groupe.membres.filter(user=request.user).exists():
            return Response({'detail': 'Vous n’êtes pas membre de ce groupe.'}, status=403)
        return Response(GroupeColocSerializer(groupe).data)

    def delete(self, request, pk):
        groupe = generics.get_object_or_404(GroupeColoc, pk=pk)
        if groupe.cree_par_id != request.user.pk:
            return Response({'detail': 'Seul le créateur peut dissoudre le groupe.'}, status=403)
        groupe.delete()
        return Response(status=204)


class InviterMembreView(APIView):
    """POST /groupes/{id}/inviter — invite un colocataire compatible (US8.2).

    Depuis une suggestion F4 acceptée ou directement depuis les membres du groupe.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        groupe = generics.get_object_or_404(GroupeColoc, pk=pk)
        if groupe.cree_par_id != request.user.pk:
            return Response({'detail': 'Seul le créateur peut inviter.'}, status=403)
        user_id = request.data.get('user_id')
        cible = generics.get_object_or_404(User, pk=user_id, role=User.Role.LOCATAIRE)
        membre, created = MembreGroupe.objects.get_or_create(
            groupe=groupe, user=cible,
            defaults={'statut': MembreGroupe.Statut.INVITE, 'invite_par': request.user},
        )
        if not created:
            return Response({'detail': 'Déjà invité ou membre.'}, status=400)
        notifier(cible, Notification.Type.INVITATION,
                 f'Invitation au groupe « {groupe.nom} »',
                 f'Invité par {request.user.first_name or request.user.username}.',
                 '/colocation')
        return Response({'membre_id': membre.pk, 'statut': membre.statut}, status=201)


class RepondreInvitationView(APIView):
    """POST /groupes/invitations/{membre_id}/repondre — accepter | refuser (US8.2)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, membre_id):
        membre = generics.get_object_or_404(MembreGroupe, pk=membre_id)
        if membre.user_id != request.user.pk:
            return Response({'detail': 'Invitation non destinée à vous.'}, status=403)
        if membre.statut != MembreGroupe.Statut.INVITE:
            return Response({'detail': 'Invitation déjà traitée.'}, status=400)
        action = request.data.get('action')
        if action == 'refuser':
            membre.delete()
            return Response(status=204)
        if action != 'accepter':
            return Response({'detail': 'action doit valoir accepter ou refuser.'}, status=400)
        membre.statut = MembreGroupe.Statut.MEMBRE
        membre.save(update_fields=['statut'])
        notifier(membre.groupe.cree_par, Notification.Type.INVITATION,
                 f'{request.user.first_name or request.user.username} a rejoint « {membre.groupe.nom} »',
                 'Votre groupe est prêt.', f'/groupes/{membre.groupe.pk}')
        return Response(GroupeColocSerializer(membre.groupe).data)


class QuitterGroupeView(APIView):
    """POST /groupes/{id}/quitter — un membre quitte (US8.5).

    Le créateur quitte en dissolvant (DELETE) pour ne pas laisser d'orphelin.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        groupe = generics.get_object_or_404(GroupeColoc, pk=pk)
        if groupe.cree_par_id == request.user.pk:
            return Response({'detail': 'Le créateur doit dissoudre le groupe (DELETE).'},
                            status=400)
        membre = generics.get_object_or_404(MembreGroupe, groupe=groupe, user=request.user)
        membre.delete()
        return Response(status=204)


class InvitationsRecuesView(APIView):
    """GET /colocation/invitations — invitations de groupe en attente (compteur)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        invs = (MembreGroupe.objects
                .filter(user=request.user, statut=MembreGroupe.Statut.INVITE)
                .select_related('groupe', 'invite_par'))
        data = [{
            'membre_id': m.pk,
            'groupe': GroupeColocSerializer(m.groupe).data,
            'invite_par': ResumeLocataireSerializer(m.invite_par).data,
        } for m in invs]
        return Response({'count': len(data), 'invitations': data})


# ---------- F5 : recommandations du groupe ----------

class RecosGroupeView(APIView):
    """GET /groupes/{id}/recommandations — logements pour le groupe entier (US8.4, F5).

    Budget combiné (ex. 450 + 500 = 950 DT) + intersection des préférences,
    puis moteur F2 avec explications F8 adaptées.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        groupe = generics.get_object_or_404(
            GroupeColoc.objects.prefetch_related('membres__user__profil_locataire'), pk=pk
        )
        if not groupe.membres.filter(user=request.user, statut=MembreGroupe.Statut.MEMBRE).exists():
            return Response({'detail': 'Vous n’êtes pas membre actif de ce groupe.'}, status=403)

        membres = [m for m in groupe.membres.all() if m.statut == MembreGroupe.Statut.MEMBRE]
        profil, faits = profil_de_groupe(membres)
        recos = recommander(profil, limit=10)

        data = []
        for r in recos:
            explications = [
                {'critere': e.critere, 'points': e.points, 'points_max': e.total,
                 'satisfait': e.satisfait, 'raison': e.raison}
                for e in r.explications
            ]
            # Explication F5 spécifique : budget combiné du groupe
            if faits['budget_total']:
                explications.insert(0, {
                    'critere': 'Budget combiné',
                    'points': next((e.points for e in r.explications if e.critere == 'Budget'), 0),
                    'points_max': 30,
                    'satisfait': r.logement.prix <= faits['budget_total'],
                    'raison': (f'Budget combiné {faits["budget_total"]} DT '
                               f'({faits["nb_membres"]} membres, {r.logement.prix} DT demandés)'),
                })
            data.append({
                'logement': LogementSerializer(r.logement, context={'request': request}).data,
                'score': r.score,
                'explications': explications,
            })

        return Response({
            'groupe': GroupeColocSerializer(groupe).data,
            'profil_groupe': {
                'budget_total': faits['budget_total'],
                'nb_membres': faits['nb_membres'],
                'ville': faits['ville'],
                'chambres': faits['chambres'],
                'budgets_individuels': faits['budgets_individuels'],
            },
            'count': len(data),
            'resultats': data,
        })
