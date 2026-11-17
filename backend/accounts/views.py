from django.core.exceptions import ObjectDoesNotExist
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.views import TokenRefreshView as BaseTokenRefreshView

from .models import ProfilLocataire
from .serializers import (
    ProfilLocataireSerializer,
    RegisterSerializer,
    UserSerializer,
)


def tokens_for(user):
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }


class RegisterView(generics.CreateAPIView):
    """Création de compte locataire ou propriétaire (US1.1)."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]  # anti-creation de comptes en rafale
    throttle_scope = 'auth'

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        data = {'user': UserSerializer(user).data, **tokens_for(user)}
        return Response(data, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    """Connexion : renvoie les tokens JWT + le profil utilisateur."""

    throttle_classes = [ScopedRateThrottle]  # anti-force brute
    throttle_scope = 'auth'

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            {**serializer.validated_data, 'user': UserSerializer(serializer.user).data}
        )


class TokenRefreshView(BaseTokenRefreshView):
    """Rafraîchissement JWT — un refresh token dont l'utilisateur a été supprimé
    (ex. `seed --reset`) doit renvoyer 401, pas 500 (User.DoesNotExist non
    traduit par DRF) : le client déconnecte alors proprement la session."""

    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except ObjectDoesNotExist:
            return Response({'detail': 'Session expirée ou compte supprimé.'},
                            status=status.HTTP_401_UNAUTHORIZED)


class MeView(generics.RetrieveUpdateAPIView):
    """Profil courant (US1.5) — GET /me, PATCH /me."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class PreferencesView(generics.RetrieveUpdateAPIView):
    """Préférences de logement du locataire (US1.6), utilisées par F2/F3."""

    serializer_class = ProfilLocataireSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        user = self.request.user
        profil, _ = ProfilLocataire.objects.get_or_create(user=user)
        return profil
