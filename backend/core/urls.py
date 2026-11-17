from django.urls import path

from .views import FavorisView, ToggleFavoriView
from .views_admin import (
    AdminDashboardView,
    AdminSignalementListView,
    AdminSignalementTraiterView,
    AdminUserListView,
    AdminUserSuspensionView,
    SignalementCreateView,
)

urlpatterns = [
    path('me/favoris/', FavorisView.as_view(), name='favoris'),
    path(
        'logements/<int:logement_id>/favori/',
        ToggleFavoriView.as_view(),
        name='toggle-favori',
    ),
    # Sprint 3 — Administration
    path('signalements/', SignalementCreateView.as_view(), name='signalement-create'),
    path('admin/signalements/', AdminSignalementListView.as_view(), name='admin-signalements'),
    path('admin/signalements/<int:pk>/traiter/', AdminSignalementTraiterView.as_view(), name='admin-signalement-traiter'),
    path('admin/dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/utilisateurs/', AdminUserListView.as_view(), name='admin-users'),
    path('admin/utilisateurs/<int:pk>/suspension/', AdminUserSuspensionView.as_view(), name='admin-user-suspension'),
]
