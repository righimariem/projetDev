from django.urls import path

from .views import MeView, PreferencesView

urlpatterns = [
    path('me/', MeView.as_view(), name='me'),
    path('me/preferences/', PreferencesView.as_view(), name='preferences'),
]
