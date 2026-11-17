from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from listings.models import Logement
from listings.serializers import LogementSerializer

from .models import Favori


class FavorisView(generics.ListAPIView):
    """Liste des favoris de l'utilisateur (US3.5)."""

    serializer_class = LogementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Logement.objects.filter(
            favorises_par__user=self.request.user
        ).prefetch_related('equipements', 'photos')


class ToggleFavoriView(APIView):
    """POST /logements/{id}/favori → ajoute ou retire le favori (idempotent)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, logement_id):
        logement = generics.get_object_or_404(Logement, pk=logement_id)
        favori, created = Favori.objects.get_or_create(user=request.user, logement=logement)
        if not created:
            favori.delete()
            return Response({'favori': False}, status=status.HTTP_200_OK)
        return Response({'favori': True}, status=status.HTTP_201_CREATED)
