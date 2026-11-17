from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from accounts.views import LoginView, RegisterView, TokenRefreshView
from listings.views_admin import AnnoncesStatutView, DecisionModerationView, FileModerationView

urlpatterns = [
    path('admin/', admin.site.urls),
    # Authentification
    path('api/v1/auth/register/', RegisterView.as_view(), name='register'),
    path('api/v1/auth/login/', LoginView.as_view(), name='login'),
    path('api/v1/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Applications
    path('api/v1/', include('accounts.urls')),
    path('api/v1/', include('listings.urls')),
    path('api/v1/', include('core.urls')),
    path('api/v1/', include('ai.urls')),
    # Sprint 5 — Colocation (F3, F4, groupes, F5)
    path('api/v1/', include('matching.urls')),
    # Sprint 5 — Chat & notifications
    path('api/v1/', include('messaging.urls')),
    # Sprint 3 — Modération des annonces (admin)
    path('api/v1/admin/annonces/en-attente/', FileModerationView.as_view(), name='admin-file-moderation'),
    path('api/v1/admin/annonces/<int:logement_id>/decision/', DecisionModerationView.as_view(), name='admin-decision-moderation'),
    path('api/v1/admin/annonces/stats/', AnnoncesStatutView.as_view(), name='admin-annonces-stats'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
