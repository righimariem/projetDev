from django.db.models import Avg, Count
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin

from .models import Logement, ModerationDecision
from .serializers import LogementSerializer, ModerationDecisionSerializer


class FileModerationView(APIView):
    """GET /admin/annonces/en-attente/ — annonces soumises par les propriétaires (US4.3)."""

    permission_classes = [IsAdmin]

    def get(self, request):
        logements = (
            Logement.objects
            .filter(statut=Logement.Statut.EN_ATTENTE)
            .select_related('proprietaire')
            .prefetch_related('equipements', 'photos')
        )
        return Response(LogementSerializer(logements, many=True).data)


class DecisionModerationView(APIView):
    """POST /admin/annonces/{id}/decision/ — accepter ou refuser avec justification (US4.4)."""

    permission_classes = [IsAdmin]

    def post(self, request, logement_id):
        logement = Logement.objects.filter(pk=logement_id).first()
        if not logement:
            return Response({'detail': 'Annonce introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ModerationDecisionSerializer(data={
            'logement': logement.pk,
            'decision': request.data.get('decision'),
            'justification': request.data.get('justification', '').strip(),
        })
        serializer.is_valid(raise_exception=True)

        decision = request.data.get('decision')
        if not serializer.validated_data['justification']:
            return Response(
                {'justification': 'La justification est obligatoire.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if decision == ModerationDecision.Decision.ACCEPTE:
            logement.statut = Logement.Statut.ACTIF
        else:
            logement.statut = Logement.Statut.REFUSE
        logement.save(update_fields=['statut'])

        instance = serializer.save(admin=request.user)
        return Response(ModerationDecisionSerializer(instance).data, status=status.HTTP_201_CREATED)


class AnnoncesStatutView(APIView):
    """GET /admin/annonces/stats/ — répartition des statuts pour le dashboard (US4.7)."""

    permission_classes = [IsAdmin]

    def get(self, request):
        data = Logement.objects.values('statut').annotate(n=Count('id'))
        prix = Logement.objects.filter(statut=Logement.Statut.ACTIF).aggregate(moyen=Avg('prix'))
        return Response({'par_statut': {d['statut']: d['n'] for d in data}, 'prix_moyen': prix['moyen']})
