"""Tests d'authentification : register, login, me, préférences."""
import pytest
from django.urls import reverse
from rest_framework import status

from .models import CustomUser, ProfilLocataire

pytestmark = pytest.mark.django_db


def test_register_locataire_creates_profil(client):
    url = reverse('register')
    resp = client.post(url, {
        'username': 'nouveau',
        'email': 'nouveau@homey.tn',
        'password': 'motdepasse123',
        'role': 'locataire',
    })
    assert resp.status_code == status.HTTP_201_CREATED
    assert 'access' in resp.data and 'user' in resp.data
    user = CustomUser.objects.get(username='nouveau')
    assert user.role == 'locataire'
    assert hasattr(user, 'profil_locataire')


def test_register_proprietaire_creates_profil(client):
    resp = client.post(reverse('register'), {
        'username': 'propri',
        'password': 'motdepasse123',
        'role': 'proprietaire',
    })
    assert resp.status_code == status.HTTP_201_CREATED
    user = CustomUser.objects.get(username='propri')
    assert hasattr(user, 'profil_proprietaire')


def test_register_admin_refuse(client):
    resp = client.post(reverse('register'), {
        'username': 'evil', 'password': 'motdepasse123', 'role': 'admin',
    })
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_register_password_trop_court(client):
    resp = client.post(reverse('register'), {
        'username': 'court', 'password': 'abc', 'role': 'locataire',
    })
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_login_rend_tokens_et_user(client, django_user_model):
    django_user_model.objects.create_user(
        username='aya', password='motdepasse123', role='locataire'
    )
    resp = client.post(reverse('login'), {'username': 'aya', 'password': 'motdepasse123'})
    assert resp.status_code == status.HTTP_200_OK
    assert 'access' in resp.data and resp.data['user']['username'] == 'aya'


def test_me_requete_authentifiee(client, django_user_model):
    django_user_model.objects.create_user(username='aya', password='motdepasse123')
    # Sans token → 401
    assert client.get(reverse('me')).status_code == status.HTTP_401_UNAUTHORIZED
    # Avec token → 200
    client.force_authenticate(user=CustomUser.objects.get(username='aya'))
    resp = client.get(reverse('me'))
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data['username'] == 'aya'


def test_preferences_maj(client, django_user_model):
    user = django_user_model.objects.create_user(username='aya', password='x', role='locataire')
    client.force_authenticate(user=user)
    resp = client.patch(reverse('preferences'), {'budget_max': 900, 'ville': 'Ariana'}, format='json')
    assert resp.status_code == status.HTTP_200_OK
    profil = ProfilLocataire.objects.get(user=user)
    assert profil.budget_max == 900 and profil.ville == 'Ariana'
