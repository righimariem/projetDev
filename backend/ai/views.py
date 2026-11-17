"""Endpoints IA Sprint 4 : F6 estimation, F7 prix inhabituels."""
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from listings.models import Logement
from ml.services.price import ModeleAbsent, estimer

from .models import AnnonceAnalyse, AnomalyFlag
from .serializers import AnnonceAnalyseSerializer, AnomalyFlagSerializer
from .services.analyse import analyser_annonce


def _features_depuis_payload(data: dict) -> dict:
    """Valide/complète le payload d'estimation avec valeurs par défaut réalistes."""
    return {
        'ville': str(data.get('ville', 'Tunis')),
        'type': str(data.get('type', 'appartement')),
        'etat': str(data.get('etat', 'bon')),
        'meuble': bool(data.get('meuble', False)),
        'surface': float(data.get('surface', 60)),
        'chambres': int(data.get('chambres', 2)),
        'sdb': int(data.get('sdb', 1)),
        'nb_equipements': int(data.get('nb_equipements', 3)),
        'age_annonces_ville': float(data.get('age_annonces_ville', 30)),
    }


THROTTLE_AI = [ScopedRateThrottle]


class EstimatePriceView(APIView):
    """POST /estimate-price/ — F6 : estime le prix d'un logement (propriétaire ou client)."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = THROTTLE_AI
    throttle_scope = 'ai'  # modèle ML coûteux (Sprint 6 — perf)

    def post(self, request):
        surface = request.data.get('surface')
        if not surface or float(surface) <= 0:
            return Response({'surface': 'Surface obligatoire et positive.'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            resultat = estimer(_features_depuis_payload(request.data))
        except ModeleAbsent as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(resultat)


class PriceCheckView(APIView):
    """GET /logements/{id}/price-check/ — F7 : prix demandé vs estimé pour UNE annonce."""

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = THROTTLE_AI
    throttle_scope = 'ai'

    def get(self, request, logement_id):
        logement = get_object_or_404(Logement, pk=logement_id)
        try:
            resultat = estimer({
                'ville': logement.ville, 'type': logement.type, 'etat': logement.etat,
                'meuble': logement.meuble, 'surface': logement.surface,
                'chambres': logement.chambres, 'sdb': logement.sdb,
                'nb_equipements': logement.equipements.count(),
                'age_annonces_ville': 30.0,
            })
        except ModeleAbsent as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        ecart_pct = round(
            100 * (logement.prix - resultat['prix_estime']) / max(resultat['prix_estime'], 1), 1
        )
        anomalie = AnomalyFlag.objects.filter(
            logement=logement, statut=AnomalyFlag.Statut.A_VERIFIER
        ).first()
        return Response({
            'prix_demande': logement.prix,
            'prix_estime': resultat['prix_estime'],
            'intervalle': [resultat['intervalle_bas'], resultat['intervalle_haut']],
            'ecart_pct': ecart_pct,
            'anomalie': AnomalyFlagSerializer(anomalie).data if anomalie else None,
            'metriques': resultat['metriques'],
        })


def _lancer_analyse(logement) -> AnnonceAnalyse:
    """Exécute l'analyse IA et persiste le résultat (US5.4 — appelée à la soumission)."""
    payload = analyser_annonce(logement)
    analyse, _ = AnnonceAnalyse.objects.update_or_create(
        logement=logement, defaults=payload,
    )
    # Prix inhabituel → aussi dans la file admin F7/US4.8 (signal, jamais fraude)
    if payload['flag_anomalie'] and payload['prix_estime']:
        ecart = 100 * (logement.prix - payload['prix_estime']) / max(payload['prix_estime'], 1)
        AnomalyFlag.objects.get_or_create(
            logement=logement,
            statut=AnomalyFlag.Statut.A_VERIFIER,
            defaults={
                'prix_predit': payload['prix_estime'],
                'ecart_pct': round(ecart, 1),
                'message': payload['message_anomalie'],
            },
        )
    return analyse


class AnalyserAnnonceView(APIView):
    """POST /logements/{id}/analyze/ — analyse F6/F7/incohérences/qualité (US5.4).

    Déclenchée automatiquement au `submit` de l'annonce ; ce point permet
    de relancer ou d'appeler l'analyse à la demande (propriétaire ou admin).
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, logement_id):
        logement = get_object_or_404(Logement, pk=logement_id)
        if logement.proprietaire != request.user and request.user.role != 'admin':
            return Response({'detail': 'Annonce non accessible.'},
                            status=status.HTTP_403_FORBIDDEN)
        analyse = _lancer_analyse(logement)
        return Response(AnnonceAnalyseSerializer(analyse).data,
                        status=status.HTTP_201_CREATED)


class QualiteAnnonceView(APIView):
    """GET /logements/{id}/qualite/ — score de qualité de MON annonce (US5.6).

    L'annonce doit avoir été analysée (auto à la soumission) ; sinon 404
    avec indication pour lancer l'analyse.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, logement_id):
        logement = get_object_or_404(Logement, pk=logement_id)
        if logement.proprietaire != request.user and request.user.role != 'admin':
            return Response({'detail': 'Annonce non accessible.'},
                            status=status.HTTP_403_FORBIDDEN)
        analyse = AnnonceAnalyse.objects.filter(logement=logement).first()
        if not analyse:
            return Response(
                {'detail': 'Annonce pas encore analysée — lancez l’analyse.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(AnnonceAnalyseSerializer(analyse).data)


class IncoherencesListView(APIView):
    """GET /admin/annonces/incoherences/ — annonces avec incohérences à vérifier (US5.3)."""

    permission_classes = [IsAdmin]

    def get(self, request):
        analyses = (
            AnnonceAnalyse.objects
            .filter(incoherences__isnull=False)
            .exclude(incoherences=[])
            .select_related('logement', 'logement__proprietaire')
            .order_by('-analyse_le')[:100]
        )
        data = []
        for a in analyses:
            data.append({
                'logement': {
                    'id': a.logement.id,
                    'titre': a.logement.titre,
                    'ville': a.logement.ville,
                    'statut': a.logement.statut,
                    'proprietaire': a.logement.proprietaire.username,
                },
                'score_qualite': a.score_qualite,
                'flag_anomalie': a.flag_anomalie,
                'message_anomalie': a.message_anomalie,
                'incoherences': a.incoherences,
                'analyse_le': a.analyse_le,
            })
        return Response(data)


class AnomalieListView(APIView):
    """GET /admin/anomalies/ — file des prix inhabituels à vérifier (US4.8/US5.5)."""

    permission_classes = [IsAdmin]

    def get(self, request):
        qs = AnomalyFlag.objects.select_related('logement', 'traite_par').all()
        statut = request.query_params.get('statut')
        if statut:
            qs = qs.filter(statut=statut)
        return Response(AnomalyFlagSerializer(qs[:100], many=True).data)


class AnomalieTraiterView(APIView):
    """POST /admin/anomalies/{id}/traiter/ — marque l'alerte vérifiée (US4.8)."""

    permission_classes = [IsAdmin]

    def post(self, request, pk):
        flag = get_object_or_404(AnomalyFlag, pk=pk)
        flag.statut = AnomalyFlag.Statut.VALIDE
        flag.traite_par = request.user
        flag.save(update_fields=['statut', 'traite_par'])
        return Response(AnomalyFlagSerializer(flag).data)
