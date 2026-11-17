"""Tests F1 : consultation publique, filtres, droits d'écriture."""
import pytest
from django.urls import reverse
from rest_framework import status

from .models import Equipement, Logement

pytestmark = pytest.mark.django_db


@pytest.fixture
def proprietaire(django_user_model):
    return django_user_model.objects.create_user(
        username='karim', password='motdepasse123', role='proprietaire'
    )


@pytest.fixture
def logements(proprietaire):
    clim = Equipement.objects.create(nom='Climatisation')
    wifi = Equipement.objects.create(nom='Wifi')
    specs = [
        ('T3 Ariana', 'Ariana', 800, 3, 90, [clim, wifi]),
        ('Studio Tunis', 'Tunis', 450, 1, 35, [wifi]),
        ('Villa La Marsa', 'La Marsa', 1800, 4, 200, [clim]),
        ('T2 Ariana', 'Ariana', 600, 2, 70, []),
    ]
    objs = []
    for titre, ville, prix, chambres, surface, equips in specs:
        obj = Logement.objects.create(
            proprietaire=proprietaire, titre=titre, ville=ville,
            prix=prix, chambres=chambres, surface=surface,
            statut=Logement.Statut.ACTIF,
        )
        obj.equipements.set(equips)
        objs.append(obj)
    return objs


def test_liste_logements_publique(client, logements):
    resp = client.get(reverse('logement-list'))
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data['count'] == 4


def test_filtre_ville(client, logements):
    resp = client.get(reverse('logement-list'), {'ville': 'Ariana'})
    assert resp.data['count'] == 2
    assert all(item['ville'] == 'Ariana' for item in resp.data['results'])


def test_filtre_prix_max(client, logements):
    resp = client.get(reverse('logement-list'), {'prix_max': 500})
    assert resp.data['count'] == 1
    assert resp.data['results'][0]['titre'] == 'Studio Tunis'


def test_filtre_chambres(client, logements):
    resp = client.get(reverse('logement-list'), {'chambres_min': 3})
    assert resp.data['count'] == 2


def test_filtre_equipements_et(client, logements):
    # doit avoir Climatisation ET Wifi
    resp = client.get(reverse('logement-list'), {'equipements': 'Climatisation,Wifi'})
    assert resp.data['count'] == 1
    assert resp.data['results'][0]['titre'] == 'T3 Ariana'


def test_filtre_combines(client, logements):
    resp = client.get(reverse('logement-list'), {'ville': 'Ariana', 'prix_max': 700})
    assert resp.data['count'] == 1
    assert resp.data['results'][0]['titre'] == 'T2 Ariana'


def test_tri_prix_croissant(client, logements):
    resp = client.get(reverse('logement-list'), {'ordering': 'prix'})
    prix = [item['prix'] for item in resp.data['results']]
    assert prix == sorted(prix)


def test_anonyme_ne_peut_creer(client):
    resp = client.post(reverse('logement-list'), {'titre': 'x', 'ville': 'Tunis', 'prix': 100, 'surface': 10}, format='json')
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_locataire_ne_peut_creer(client, django_user_model):
    loc = django_user_model.objects.create_user(username='aya', password='x', role='locataire')
    client.force_authenticate(user=loc)
    resp = client.post(reverse('logement-list'), {'titre': 'x', 'ville': 'Tunis', 'prix': 100, 'surface': 10}, format='json')
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_proprietaire_peut_creer(client, proprietaire):
    client.force_authenticate(user=proprietaire)
    resp = client.post(reverse('logement-list'), {
        'titre': 'Mon T2', 'ville': 'Sfax', 'prix': 550, 'surface': 65, 'chambres': 2,
    }, format='json')
    assert resp.status_code == status.HTTP_201_CREATED
    obj = Logement.objects.get(titre='Mon T2')
    assert obj.proprietaire == proprietaire and obj.statut == Logement.Statut.ACTIF


def test_proprietaire_ne_peut_modifier_annonces_autres(client, proprietaire, django_user_model):
    autre = django_user_model.objects.create_user(username='autre', password='x', role='proprietaire')
    logement = Logement.objects.create(
        proprietaire=autre, titre='Sa maison', ville='Tunis', prix=700, surface=80
    )
    client.force_authenticate(user=proprietaire)
    resp = client.patch(reverse('logement-detail', args=[logement.pk]), {'prix': 1}, format='json')
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_prix_par_m2_calculé(client, logements):
    resp = client.get(reverse('logement-detail', args=[logements[0].pk]))
    assert resp.data['prix_par_m2'] == round(800 / 90, 1)


def test_mes_annonces_quels_que_soient_les_statuts(client, proprietaire, django_user_model):
    """?mes=1 : le propriétaire voit ses annonces même non actives, jamais celles des autres (US2.5)."""
    autre = django_user_model.objects.create_user(username='autre', password='x', role='proprietaire')
    Logement.objects.create(
        proprietaire=autre, titre="Annonce d'autrui", ville='Tunis', prix=500, surface=40
    )
    mienne = Logement.objects.create(
        proprietaire=proprietaire, titre='Ma annonce', ville='Sfax', prix=600, surface=55,
        statut=Logement.Statut.REFUSE,  # non active : doit rester visible pour son propriétaire
    )
    client.force_authenticate(user=proprietaire)
    resp = client.get(reverse('logement-list'), {'mes': '1'})
    assert resp.data['count'] == 1
    assert resp.data['results'][0]['id'] == mienne.pk


def test_mes_annonces_anonyme_renvoie_les_actives(client, logements):
    """?mes=1 sans token ne doit rien laisser fuiter : annonces actives seulement."""
    resp = client.get(reverse('logement-list'), {'mes': '1'})
    assert resp.data['count'] == 4  # les 4 fixtures sont actives
    assert all(item['statut'] == 'actif' for item in resp.data['results'])
