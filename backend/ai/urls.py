from django.urls import path

from .views import (
    AnalyserAnnonceView,
    AnomalieListView,
    AnomalieTraiterView,
    EstimatePriceView,
    IncoherencesListView,
    PriceCheckView,
    QualiteAnnonceView,
)
from .views_descrire import DescriptionAssisteeView
from .views_reco import EnregistrerRechercheView, RecommendationsView

urlpatterns = [
    path('estimate-price/', EstimatePriceView.as_view(), name='estimate-price'),
    path('recommendations/', RecommendationsView.as_view(), name='recommendations'),
    # US6.4 — profil comportemental
    path('recherches/', EnregistrerRechercheView.as_view(), name='recherches'),
    path('logements/<int:logement_id>/price-check/', PriceCheckView.as_view(), name='price-check'),
    # US5.3/US5.4/US5.6 — analyse IA des annonces
    path('logements/<int:logement_id>/analyze/', AnalyserAnnonceView.as_view(), name='annonce-analyze'),
    path('logements/<int:logement_id>/qualite/', QualiteAnnonceView.as_view(), name='annonce-qualite'),
    path('admin/annonces/incoherences/', IncoherencesListView.as_view(), name='admin-incoherences'),
    # US5.1 — description assistée
    path('describe-listing/', DescriptionAssisteeView.as_view(), name='describe-listing'),
    path('admin/anomalies/', AnomalieListView.as_view(), name='admin-anomalies'),
    path('admin/anomalies/<int:pk>/traiter/', AnomalieTraiterView.as_view(), name='admin-anomalie-traiter'),
]
