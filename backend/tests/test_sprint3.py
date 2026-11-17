"""Tests Sprint 3 : modération (US2.6, US4.3–4.4), signalements (US4.5–4.6), dashboard (US4.7), suspension (US4.2)."""
import pytest
from django.urls import reverse
from rest_framework import status

from core.models import Signalement
from listings.models import Logement, ModerationDecision

pytestmark = pytest.mark.django_db


@pytest.fixture
def admin(django_user_model):
    return django_user_model.objects.create_user(
        username='admin1', password='x', role='admin', is_staff=True
    )


@pytest.fixture
def proprietaire(django_user_model):
    return django_user_model.objects.create_user(
        username='karim', password='x', role='proprietaire'
    )


@pytest.fixture
def locataire(django_user_model):
    return django_user_model.objects.create_user(username='aya', password='x')


@pytest.fixture
def annonce(proprietaire):
    return Logement.objects.create(
        proprietaire=proprietaire, titre='T2 Ariana', ville='Ariana',
        prix=700, surface=65, statut=Logement.Statut.ACTIF,
    )


def _submit(client, annonce):
    client.force_authenticate(user=annonce.proprietaire)
    return client.post(reverse('logement-submit', args=[annonce.pk]))


def test_proprietaire_soumet_annonce(client, annonce):
    resp = _submit(client, annonce)
    assert resp.status_code == status.HTTP_200_OK
    annonce.refresh_from_db()
    assert annonce.statut == Logement.Statut.EN_ATTENTE


def test_autre_proprietaire_ne_peut_soumettre(client, annonce, django_user_model):
    autre = django_user_model.objects.create_user(username='autre', password='x', role='proprietaire')
    client.force_authenticate(user=autre)
    assert client.post(reverse('logement-submit', args=[annonce.pk])).status_code == status.HTTP_403_FORBIDDEN


def test_file_moderation_admin_seul(client, annonce, locataire):
    _submit(client, annonce)
    client.force_authenticate(user=locataire)
    assert client.get(reverse('admin-file-moderation')).status_code == status.HTTP_403_FORBIDDEN
    client.force_authenticate(user=None)
    assert client.get(reverse('admin-file-moderation')).status_code == status.HTTP_401_UNAUTHORIZED


def test_file_moderation_liste_en_attente(client, annonce, admin):
    _submit(client, annonce)
    autre = Logement.objects.create(
        proprietaire=annonce.proprietaire, titre='Déjà actif', ville='Tunis',
        prix=800, surface=70, statut=Logement.Statut.ACTIF,
    )
    client.force_authenticate(user=admin)
    resp = client.get(reverse('admin-file-moderation'))
    assert resp.status_code == status.HTTP_200_OK
    ids = [item['id'] for item in resp.data]
    assert annonce.pk in ids and autre.pk not in ids


def test_admin_accepte_avec_justification(client, annonce, admin):
    _submit(client, annonce)
    client.force_authenticate(user=admin)
    resp = client.post(reverse('admin-decision-moderation', args=[annonce.pk]), {
        'decision': 'accepte', 'justification': 'Annonce conforme.',
    }, format='json')
    assert resp.status_code == status.HTTP_201_CREATED
    annonce.refresh_from_db()
    assert annonce.statut == Logement.Statut.ACTIF
    decision = ModerationDecision.objects.get(logement=annonce)
    assert decision.admin == admin and decision.decision == 'accepte'


def test_admin_refuse_avec_justification(client, annonce, admin):
    _submit(client, annonce)
    client.force_authenticate(user=admin)
    resp = client.post(reverse('admin-decision-moderation', args=[annonce.pk]), {
        'decision': 'refuse', 'justification': 'Prix incohérent avec la surface.',
    }, format='json')
    assert resp.status_code == status.HTTP_201_CREATED
    annonce.refresh_from_db()
    assert annonce.statut == Logement.Statut.REFUSE


def test_justification_obligatoire(client, annonce, admin):
    _submit(client, annonce)
    client.force_authenticate(user=admin)
    resp = client.post(reverse('admin-decision-moderation', args=[annonce.pk]), {
        'decision': 'accepte', 'justification': '   ',
    }, format='json')
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    annonce.refresh_from_db()
    assert annonce.statut == Logement.Statut.EN_ATTENTE  # inchangé


def test_annonce_inexistante_404(client, admin):
    client.force_authenticate(user=admin)
    resp = client.post(reverse('admin-decision-moderation', args=[999]), {
        'decision': 'accepte', 'justification': 'x',
    }, format='json')
    assert resp.status_code == status.HTTP_404_NOT_FOUND


def test_signalement_creation(client, locataire, annonce):
    client.force_authenticate(user=locataire)
    resp = client.post(reverse('signalement-create'), {
        'cible_type': 'annonce', 'cible_id': annonce.pk, 'motif': 'Prix suspect.',
    }, format='json')
    assert resp.status_code == status.HTTP_201_CREATED
    s = Signalement.objects.get(pk=resp.data['id'])
    assert s.signaleur == locataire and s.statut == Signalement.Statut.NOUVEAU


def test_signalement_motif_obligatoire(client, locataire, annonce):
    client.force_authenticate(user=locataire)
    resp = client.post(reverse('signalement-create'), {
        'cible_type': 'annonce', 'cible_id': annonce.pk, 'motif': '  ',
    }, format='json')
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_admin_liste_et_traite_signalement(client, locataire, annonce, admin):
    client.force_authenticate(user=locataire)
    sid = client.post(reverse('signalement-create'), {
        'cible_type': 'annonce', 'cible_id': annonce.pk, 'motif': 'Photos fausses.',
    }, format='json').data['id']
    client.force_authenticate(user=admin)
    # Liste des nouveaux
    resp = client.get(reverse('admin-signalements'), {'statut': 'nouveau'})
    assert resp.data['count'] == 1
    # Traitement
    resp = client.post(reverse('admin-signalement-traiter', args=[sid]))
    assert resp.status_code == status.HTTP_200_OK and resp.data['statut'] == 'traite'
    # La file des nouveaux est vide
    assert client.get(reverse('admin-signalements'), {'statut': 'nouveau'}).data['count'] == 0


def test_locataire_ne_peut_pas_admin(client, locataire):
    client.force_authenticate(user=locataire)
    assert client.get(reverse('admin-dashboard')).status_code == status.HTTP_403_FORBIDDEN
    assert client.get(reverse('admin-signalements')).status_code == status.HTTP_403_FORBIDDEN
    assert client.get(reverse('admin-file-moderation')).status_code == status.HTTP_403_FORBIDDEN


def test_dashboard_stats(client, admin, annonce, locataire):
    _submit(client, annonce)  # passe en attente
    client.force_authenticate(user=admin)
    resp = client.get(reverse('admin-dashboard'))
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data['utilisateurs']['total'] >= 3
    assert resp.data['annonces']['en_attente'] == 1
    assert resp.data['signalements']['nouveaux'] == 0


def test_admin_liste_utilisateurs(client, admin, locataire):
    client.force_authenticate(user=admin)
    resp = client.get(reverse('admin-users'), {'role': 'locataire'})
    assert resp.data['count'] >= 1
    assert all(item['role'] == 'locataire' for item in resp.data['results'])


def test_suspension_bloque_le_compte(client, admin, locataire):
    client.force_authenticate(user=admin)
    resp = client.post(reverse('admin-user-suspension', args=[locataire.pk]), {'action': 'suspendre'}, format='json')
    assert resp.status_code == status.HTTP_200_OK and resp.data['is_suspended'] is True
    locataire.refresh_from_db()
    assert locataire.is_suspended and not locataire.is_active
    # Le compte suspendu ne peut plus se connecter
    client.force_authenticate(user=None)
    resp = client.post(reverse('login'), {'username': locataire.username, 'password': 'x'})
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_reactivation(client, admin, locataire):
    client.force_authenticate(user=admin)
    client.post(reverse('admin-user-suspension', args=[locataire.pk]), {'action': 'suspendre'}, format='json')
    resp = client.post(reverse('admin-user-suspension', args=[locataire.pk]), {'action': 'reactiver'}, format='json')
    assert resp.data['is_suspended'] is False
    locataire.refresh_from_db()
    assert locataire.is_active


def test_admin_ne_peut_pas_se_suspendre_lui_meme(client, admin):
    client.force_authenticate(user=admin)
    resp = client.post(reverse('admin-user-suspension', args=[admin.pk]), {'action': 'suspendre'}, format='json')
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_admin_voir_annonce_refusee(client, annonce, admin, locataire):
    """L'admin doit pouvoir consulter le détail d'une annonce refusée (et non active)."""
    annonce.statut = Logement.Statut.REFUSE
    annonce.save(update_fields=['statut'])
    # Un locataire ne la voit pas
    client.force_authenticate(user=locataire)
    assert client.get(reverse('logement-detail', args=[annonce.pk])).status_code == status.HTTP_404_NOT_FOUND
    # L'admin, si
    client.force_authenticate(user=admin)
    resp = client.get(reverse('logement-detail', args=[annonce.pk]))
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data['statut'] == 'refuse'
