from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import LogementViewSet, PhotoViewSet, SearchNaturalView

router = DefaultRouter()
router.register('logements', LogementViewSet, basename='logement')
router.register('photos', PhotoViewSet, basename='photo')

urlpatterns = [
    # US6.1 — recherche en langage naturel
    path('search-natural/', SearchNaturalView.as_view(), name='search-natural'),
] + router.urls
