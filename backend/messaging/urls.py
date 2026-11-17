"""URLs Sprint 5 — chat et notifications."""
from django.urls import path

from .views import (
    ConversationDetailView,
    ConversationsView,
    EnvoyerMessageView,
    MarquerConversationLueView,
    NotificationsView,
    ToutMarquerLuView,
)

urlpatterns = [
    # Chat (US9.1–9.3) — polling REST
    path('conversations/', ConversationsView.as_view(), name='conversations'),
    path('conversations/<int:pk>/', ConversationDetailView.as_view(), name='conversation-detail'),
    path('conversations/<int:pk>/messages/', EnvoyerMessageView.as_view(),
         name='conversation-messages'),
    path('conversations/<int:pk>/luer/', MarquerConversationLueView.as_view(),
         name='conversation-luer'),
    # Notifications (US9.4–9.6)
    path('notifications/', NotificationsView.as_view(), name='notifications'),
    path('notifications/<int:pk>/lire/', NotificationsView.as_view(), name='notification-lire'),
    path('notifications/lues/', ToutMarquerLuView.as_view(), name='notifications-lues'),
]
