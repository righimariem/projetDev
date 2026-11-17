from django.db.models import Q
from rest_framework import decorators, permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .filters import LogementFilter
from .models import Logement, Photo
from .serializers import LogementCreateSerializer, LogementSerializer, PhotoSerializer
from .services_nl import extraire_criteres


class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.proprietaire == request.user


class LogementViewSet(viewsets.ModelViewSet):
    """API F1 : consultation publique + gestion propriétaire (EPIC 2, EPIC 3)."""

    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    filterset_class = LogementFilter
    ordering_fields = ['prix', 'surface', 'chambres', 'created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = Logement.objects.select_related('proprietaire').prefetch_related(
            'equipements', 'photos'
        )
        user = self.request.user
        # ?mes=1 : mes propres annonces, quel que soit le statut (US2.5)
        if self.request.query_params.get('mes') == '1' and user.is_authenticated:
            return queryset.filter(proprietaire=user)
        # L'administrateur voit toutes les annonces (modération, US4.3)
        if user.is_authenticated and user.role == 'admin':
            return queryset
        # Visiteur : annonces actives uniquement ; connecté : actives + les siennes
        if user.is_authenticated and user.is_proprietaire:
            return queryset.filter(Q(statut=Logement.Statut.ACTIF) | Q(proprietaire=user))
        return queryset.filter(statut=Logement.Statut.ACTIF)

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return LogementCreateSerializer
        return LogementSerializer

    def perform_create(self, serializer):
        if not self.request.user.is_proprietaire:
            raise PermissionDenied('Seul un propriétaire peut publier une annonce.')
        serializer.save(proprietaire=self.request.user, statut=Logement.Statut.ACTIF)

    @decorators.action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Soumettre l'annonce à la validation admin (US2.6).

        US5.4 (MUST) : l'analyse IA (F6/F7, incohérences, qualité) est lancée
        automatiquement pour que l'admin dispose des résultats au moment de la
        vérification.
        """
        logement = self.get_object()
        if logement.proprietaire != request.user:
            raise PermissionDenied("Vous n'êtes pas propriétaire de cette annonce.")
        logement.statut = Logement.Statut.EN_ATTENTE
        logement.save(update_fields=['statut'])

        # Analyse auto à la soumission (US5.4) — import tardif : évite un
        # import circulaire listings ↔ ai.
        from ai.views import _lancer_analyse
        _lancer_analyse(logement)

        return Response({'statut': logement.statut}, status=status.HTTP_200_OK)


class SearchNaturalView(APIView):
    """GET /search-natural/?q=… — US6.1 : phrase en langage naturel → critères F1 + résultats.

    Retourne les critères interprétés (avec explication) ET les logements
    correspondants, afin que l'écran montre comment la phrase a comprise.
    """

    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'ai'  # appelée aussi par visiteurs (Sprint 6 — perf)

    def get(self, request):
        question = (request.query_params.get('q') or '').strip()
        if len(question) < 3:
            return Response(
                {'detail': 'Décrivez votre recherche en une phrase (3 caractères minimum).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        extraction = extraire_criteres(question)
        filtres = extraction['filtres']

        # Réutilisation exacte du filtre F1 (mêmes règles que /logements/)
        queryset = LogementFilter(
            data={k: v for k, v in filtres.items()},
            queryset=Logement.objects.select_related('proprietaire').prefetch_related(
                'equipements', 'photos'
            ).filter(statut=Logement.Statut.ACTIF),
        ).qs
        logements = list(queryset[:20])

        return Response({
            'requete': question,
            'criteres': extraction['explications'],
            'filtres': filtres,
            'interpretation_reussie': bool(filtres),
            'count': len(logements),
            'resultats': LogementSerializer(logements, many=True,
                                            context={'request': request}).data,
        })


class PhotoViewSet(viewsets.ModelViewSet):
    """Upload/suppression des photos d'un logement (US2.2)."""

    serializer_class = PhotoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Photo.objects.filter(logement__proprietaire=self.request.user)

    def perform_create(self, serializer):
        logement_id = self.request.data.get('logement')
        logement = Logement.objects.filter(pk=logement_id).first()
        if not logement or logement.proprietaire != self.request.user:
            raise PermissionDenied('Ce logement ne vous appartient pas.')
        serializer.save(logement=logement)
