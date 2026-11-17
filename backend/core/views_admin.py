from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from listings.models import Logement

from .models import Signalement
from .serializers import SignalementSerializer

User = get_user_model()


class SignalementCreateView(generics.CreateAPIView):
    """POST /signalements/ — signaler une annonce ou un compte (US4.5)."""

    serializer_class = SignalementSerializer

    def perform_create(self, serializer):
        serializer.save(signaleur=self.request.user)


class AdminSignalementListView(generics.ListAPIView):
    """GET /admin/signalements/?statut=nouveau — file de traitement (US4.6)."""

    serializer_class = SignalementSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = Signalement.objects.all()
        statut = self.request.query_params.get('statut')
        if statut:
            qs = qs.filter(statut=statut)
        return qs


class AdminSignalementTraiterView(APIView):
    """POST /admin/signalements/{id}/traiter/ — marque un signalement traité (US4.6)."""

    permission_classes = [IsAdmin]

    def post(self, request, pk):
        signalement = Signalement.objects.filter(pk=pk).first()
        if not signalement:
            return Response({'detail': 'Signalement introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        signalement.statut = Signalement.Statut.TRAITE
        signalement.traite_par = request.user
        signalement.save(update_fields=['statut', 'traite_par'])
        return Response(SignalementSerializer(signalement).data)


class AdminDashboardView(APIView):
    """GET /admin/dashboard/ — statistiques de la plateforme (US4.7)."""

    permission_classes = [IsAdmin]

    def get(self, request):
        users = User.objects.all()
        logements = Logement.objects.all()
        return Response({
            'utilisateurs': {
                'total': users.count(),
                'locataires': users.filter(role='locataire').count(),
                'proprietaires': users.filter(role='proprietaire').count(),
                'suspends': users.filter(is_suspended=True).count(),
            },
            'annonces': {
                'total': logements.count(),
                'actives': logements.filter(statut=Logement.Statut.ACTIF).count(),
                'en_attente': logements.filter(statut=Logement.Statut.EN_ATTENTE).count(),
                'refusees': logements.filter(statut=Logement.Statut.REFUSE).count(),
                'louees': logements.filter(statut=Logement.Statut.LOUE).count(),
                'prix_moyen': logements.filter(statut=Logement.Statut.ACTIF).aggregate(
                    m=Avg('prix')
                )['m'] or 0,
                'par_ville': list(
                    logements.filter(statut=Logement.Statut.ACTIF)
                    .values('ville').annotate(n=Count('id')).order_by('-n')[:5]
                ),
            },
            'signalements': {
                'nouveaux': Signalement.objects.filter(statut=Signalement.Statut.NOUVEAU).count(),
                'traites': Signalement.objects.filter(statut=Signalement.Statut.TRAITE).count(),
            },
        })


class AdminUserListView(generics.ListAPIView):
    """GET /admin/utilisateurs/?role=&q= — gestion des comptes (US4.1)."""

    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        from accounts.serializers import UserSerializer
        return UserSerializer

    def get_queryset(self):
        qs = User.objects.all().order_by('-created_at')
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(Q(username__icontains=q) | Q(email__icontains=q))
        return qs


class AdminUserSuspensionView(APIView):
    """POST /admin/utilisateurs/{id}/suspension/ — suspendre ou réactiver (US4.2)."""

    permission_classes = [IsAdmin]

    def post(self, request, pk):
        action = request.data.get('action')  # 'suspendre' | 'reactiver'
        if action not in ('suspendre', 'reactiver'):
            return Response({'detail': "Action invalide ('suspendre' ou 'reactiver')."},
                            status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(pk=pk).first()
        if not user:
            return Response({'detail': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if user == request.user:
            return Response({'detail': 'Action impossible sur votre propre compte.'},
                            status=status.HTTP_400_BAD_REQUEST)
        user.is_suspended = action == 'suspendre'
        # Un compte suspendu ne doit plus pouvoir se connecter
        user.is_active = action != 'suspendre'
        user.save(update_fields=['is_suspended', 'is_active'])
        return Response({'id': user.id, 'is_suspended': user.is_suspended})
