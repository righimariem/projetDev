"""URLs Sprint 5 — colocation (F3, F4, groupes, F5)."""
from django.urls import path

from .views import (
    GroupeDetailView,
    InvitationsRecuesView,
    InviterMembreView,
    MesGroupesView,
    PrefColocView,
    PropositionsColocView,
    QuitterGroupeView,
    RecosGroupeView,
    RepondreInvitationView,
    RepondrePropositionView,
    SuggestionsColocView,
)

urlpatterns = [
    # F3 — préférences de colocation
    path('colocation/prefs/', PrefColocView.as_view(), name='coloc-prefs'),
    # F4 — matching colocataire
    path('colocation/suggestions/', SuggestionsColocView.as_view(), name='coloc-suggestions'),
    path('colocation/propositions/', PropositionsColocView.as_view(), name='coloc-propositions'),
    path('colocation/propositions/<int:pk>/repondre/', RepondrePropositionView.as_view(),
         name='coloc-repondre'),
    path('colocation/invitations/', InvitationsRecuesView.as_view(), name='coloc-invitations'),
    # Groupes (EPIC 8) + F5
    path('groupes/', MesGroupesView.as_view(), name='groupes'),
    path('groupes/<int:pk>/', GroupeDetailView.as_view(), name='groupe-detail'),
    path('groupes/<int:pk>/inviter/', InviterMembreView.as_view(), name='groupe-inviter'),
    path('groupes/<int:pk>/quitter/', QuitterGroupeView.as_view(), name='groupe-quitter'),
    path('groupes/invitations/<int:membre_id>/repondre/', RepondreInvitationView.as_view(),
         name='groupe-invitation-repondre'),
    path('groupes/<int:pk>/recommandations/', RecosGroupeView.as_view(),
         name='groupe-recos'),
]
