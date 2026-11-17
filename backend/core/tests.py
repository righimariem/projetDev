"""Tests favoris (US3.5) : liste, toggle, authentification requise."""
import pytest
from django.urls import reverse
from rest_framework import status

from listings.models import Logement

from .models import Favori

pytestmark = pytest.mark.django_db


@pytest.fixture
def logement(django_user_model):
    user = django_user_model.objects.create_user(
        username='karim', password='x', role='proprietaire'
    )
    return Logement.objects.create(
        proprietaire=user, titre='T2', ville='Tunis', prix=700, surface=65
    )


def test_favoris_requiert_auth(client):
    assert client.get(reverse('favoris')).status_code == status.HTTP_401_UNAUTHORIZED


def test_toggle_ajoute_et_liste(client, django_user_model, logement):
    user = django_user_model.objects.create_user(username='aya', password='x')
    client.force_authenticate(user=user)
    # Ajout
    resp = client.post(reverse('toggle-favori', args=[logement.pk]))
    assert resp.status_code == status.HTTP_201_CREATED and resp.data['favori'] is True
    assert Favori.objects.filter(user=user, logement=logement).exists()
    # Liste
    resp = client.get(reverse('favoris'))
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data['count'] == 1
    assert resp.data['results'][0]['titre'] == 'T2'


def test_toggle_retire(client, django_user_model, logement):
    user = django_user_model.objects.create_user(username='aya', password='x')
    client.force_authenticate(user=user)
    client.post(reverse('toggle-favori', args=[logement.pk]))
    resp = client.post(reverse('toggle-favori', args=[logement.pk]))
    assert resp.data['favori'] is False
    assert not Favori.objects.filter(user=user, logement=logement).exists()


def test_favoris_isoles_par_utilisateur(client, django_user_model, logement):
    aya = django_user_model.objects.create_user(username='aya', password='x')
    yasmine = django_user_model.objects.create_user(username='yasmine', password='x')
    client.force_authenticate(user=aya)
    client.post(reverse('toggle-favori', args=[logement.pk]))
    client.force_authenticate(user=yasmine)
    assert client.get(reverse('favoris')).data['count'] == 0
