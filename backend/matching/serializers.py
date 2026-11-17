"""Serializers Sprint 5 — colocation (profils, propositions, groupes)."""
from django.contrib.auth import get_user_model
from rest_framework import serializers

from accounts.models import ProfilLocataire

from .models import GroupeColoc, MembreGroupe, PropositionMatching

User = get_user_model()


class ResumeLocataireSerializer(serializers.ModelSerializer):
    """Affichage léger d'un profil pour les suggestions F4."""

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']


class ColocProfilSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfilLocataire
        fields = [
            'mode_recherche', 'veut_colocation', 'budget_min', 'budget_max',
            'ville', 'disponibilite', 'fumeur', 'animaux', 'niveau_proprete',
            'niveau_bruit', 'horaires', 'visiteurs', 'habitudes',
        ]


class PropositionSerializer(serializers.ModelSerializer):
    expediteur = ResumeLocataireSerializer(read_only=True)
    destinataire = ResumeLocataireSerializer(read_only=True)
    groupe_id = serializers.IntegerField(source='groupe.pk', read_only=True)

    class Meta:
        model = PropositionMatching
        fields = [
            'id', 'expediteur', 'destinataire', 'score', 'explications',
            'statut', 'groupe_id', 'created_at', 'repondu_at',
        ]
        read_only_fields = fields


class MembreGroupeSerializer(serializers.ModelSerializer):
    user = ResumeLocataireSerializer(read_only=True)
    profil = ColocProfilSerializer(source='user.profil_locataire', read_only=True)

    class Meta:
        model = MembreGroupe
        fields = ['id', 'user', 'profil', 'statut', 'invite_par', 'created_at']
        read_only_fields = fields


class GroupeColocSerializer(serializers.ModelSerializer):
    membres = MembreGroupeSerializer(many=True, read_only=True)
    cree_par = ResumeLocataireSerializer(read_only=True)

    class Meta:
        model = GroupeColoc
        fields = ['id', 'nom', 'cree_par', 'membres', 'created_at']
        read_only_fields = fields
