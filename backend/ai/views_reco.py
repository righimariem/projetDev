"""Endpoint F2 : recommandations de logements avec explications F8."""
from datetime import timedelta

from django.utils import timezone
from rest_framework import permissions, response, status, views

from accounts.models import ProfilLocataire
from listings.serializers import LogementSerializer
from ml.services.reco import recommander

from .models import Recherche


class EnregistrerRechercheView(views.APIView):
    """POST /recherches/ — historise une recherche (US6.4, alimente le bonus F2).

    Le frontend l appelle à chaque recherche (filtres classiques ou langage
    naturel) pour construire le profil comportemental.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        requete = str(request.data.get('requete', ''))[:200]
        filtres = request.data.get('filtres') or {}
        if not isinstance(filtres, dict):
            return response.Response({'filtres': 'Attendu un objet.'},
                                     status=status.HTTP_400_BAD_REQUEST)
        recherche = Recherche.objects.create(
            user=request.user, requete=requete, filtres=filtres,
            nb_resultats=int(request.data.get('nb_resultats', 0) or 0),
        )
        return response.Response({'id': recherche.id}, status=status.HTTP_201_CREATED)

# US6.4 — bonus comportemental : villes recherchées / consultées récemment
BONUS_COMPORTEMENTAL = 5
FENETRE_JOURS = 14


class RecommendationsView(views.APIView):
    """GET /recommendations/?limit=10 — top-K expliqué pour le locataire connecté (F2/F8)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profil, _ = ProfilLocataire.objects.get_or_create(user=request.user)
        limit = min(int(request.query_params.get('limit', 10)), 50)
        recos = recommander(profil, limit=limit)

        # Ids déjà favoris pour affichage côté client
        favoris_ids = set(request.user.favoris.values_list('logement_id', flat=True))

        # US6.4 — profil comportemental : villes des 20 dernières recherches + favoris
        depuis = timezone.now() - timedelta(days=FENETRE_JOURS)
        villes_recherchees = {
            str(f.get('ville', '')).lower()
            for f in Recherche.objects.filter(user=request.user, created_at__gte=depuis)
            .values_list('filtres', flat=True)
            if isinstance(f, dict) and f.get('ville')
        }
        villes_favoris = {
            v.lower() for v in request.user.favoris.values_list(
                'logement__ville', flat=True)
        }
        villes_comportement = villes_recherchees | villes_favoris

        data = []
        for r in recos:
            explications = [
                {'critere': e.critere, 'points': e.points, 'points_max': e.total,
                 'satisfait': e.satisfait, 'raison': e.raison}
                for e in r.explications
            ]
            score = r.score
            pourquoi = list(r.as_dict()['explications_fortes'])

            # Bonus comportemental explicite (F8 : toujours accompagné d une raison)
            if r.logement.ville.lower() in villes_comportement:
                score = min(100, score + BONUS_COMPORTEMENTAL)
                raison = f'{r.logement.ville} correspond à vos recherches récentes'
                explications.append({
                    'critere': 'Comportement', 'points': BONUS_COMPORTEMENTAL,
                    'points_max': BONUS_COMPORTEMENTAL, 'satisfait': True,
                    'raison': raison,
                })
                pourquoi.append(raison)

            logement_data = LogementSerializer(r.logement, context={'request': request}).data
            data.append({
                'logement': logement_data,
                'score': score,
                'pourquoi': pourquoi,
                'explications': explications,
                'favori': r.logement.id in favoris_ids,
            })

        data.sort(key=lambda d: -d['score'])

        return response.Response({
            'profil_complet': bool(profil.ville or profil.budget_max),
            'count': len(data),
            'resultats': data,
        })
