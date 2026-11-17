from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import ProfilLocataire, ProfilProprietaire

User = get_user_model()


class ProfilLocataireSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfilLocataire
        fields = [
            'budget_min', 'budget_max', 'ville', 'quartier', 'chambres_souhaitees',
            'surface_min', 'disponibilite', 'equipements_desires', 'mode_recherche',
            'veut_colocation', 'fumeur', 'animaux', 'niveau_proprete', 'niveau_bruit',
            'horaires', 'visiteurs', 'habitudes',
        ]


class ProfilProprietaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfilProprietaire
        fields = ['agence', 'verifie']


class UserSerializer(serializers.ModelSerializer):
    profil_locataire = ProfilLocataireSerializer(read_only=True)
    profil_proprietaire = ProfilProprietaireSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'telephone', 'is_suspended',
            'profil_locataire', 'profil_proprietaire',
        ]
        read_only_fields = ['id', 'role', 'is_suspended']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(
        choices=[User.Role.LOCATAIRE, User.Role.PROPRIETAIRE], default=User.Role.LOCATAIRE
    )

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'role', 'telephone']

    def validate_role(self, value):
        if value == User.Role.ADMIN:
            raise serializers.ValidationError("Inscription admin impossible.")
        return value

    def create(self, validated_data):
        role = validated_data.pop('role', User.Role.LOCATAIRE)
        password = validated_data.pop('password')
        user = User(**validated_data, role=role)
        user.set_password(password)
        user.save()
        if role == User.Role.LOCATAIRE:
            ProfilLocataire.objects.create(user=user)
        else:
            ProfilProprietaire.objects.create(user=user)
        return user
