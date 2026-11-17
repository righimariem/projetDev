"""Tests Sprint 5 : F3 (préférences coloc), F4 (matching), groupes, F5, chat, notifications."""
import pytest
from django.urls import reverse
from rest_framework import status

from accounts.models import ProfilLocataire
from matching import services
from matching.models import GroupeColoc, MembreGroupe
from messaging.models import Conversation, Notification

pytestmark = pytest.mark.django_db


def _user(django_user_model, username, **prefs):
    user = django_user_model.objects.create_user(username=username, password='x')
    ProfilLocataire.objects.create(user=user, **prefs)
    return user


PROFIL_A = dict(ville='Ariana', budget_max=450, mode_recherche='coloc', veut_colocation=True,
                fumeur=False, animaux=False, niveau_proprete=4, niveau_bruit=2,
                horaires='soir', visiteurs='occasionnel', habitudes='calme, études')
PROFIL_B = dict(ville='Ariana', budget_max=500, mode_recherche='coloc', veut_colocation=True,
                fumeur=False, animaux=False, niveau_proprete=4, niveau_bruit=2,
                horaires='soir', visiteurs='occasionnel', habitudes='calme, sport')


# ---------- F3 : préférences de colocation ----------

def test_f3_prefs_requiert_auth(client):
    resp = client.get(reverse('coloc-prefs'))
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_f3_prefs_sauvegarde(client, django_user_model):
    user = _user(django_user_model, 'aya')
    client.force_authenticate(user=user)
    resp = client.patch(reverse('coloc-prefs'),
                        {'mode_recherche': 'coloc', 'fumeur': True, 'niveau_bruit': 4},
                        format='json')
    assert resp.status_code == status.HTTP_200_OK
    profil = user.profil_locataire
    profil.refresh_from_db()
    assert profil.mode_recherche == 'coloc' and profil.fumeur is True


# ---------- F4 : moteur ----------

def test_f4_profil_identique_est_fortement_compatible(django_user_model):
    a = _user(django_user_model, 'a', **PROFIL_A)
    b = _user(django_user_model, 'b', **PROFIL_A)
    comp = services.compatibilite(a.profil_locataire, b.profil_locataire)
    assert comp.score >= 90, comp.as_dict()
    assert comp.communs and not comp.divergents


def test_f4_profil_oppose_est_peu_compatible(django_user_model):
    a = _user(django_user_model, 'a', **PROFIL_A)
    b = _user(django_user_model, 'b', **{**PROFIL_B, 'ville': 'Sfax', 'fumeur': True,
                                          'animaux': True, 'horaires': 'nuit',
                                          'niveau_proprete': 1, 'niveau_bruit': 5,
                                          'visiteurs': 'quotidien',
                                          'habitudes': 'fêtes, musique'})
    comp = services.compatibilite(a.profil_locataire, b.profil_locataire)
    assert comp.score < 50, comp.as_dict()


def test_f4_explications_couvrent_tous_les_critères(django_user_model):
    """US7.4 : chaque score est expliqué, critère par critère (F8)."""
    a = _user(django_user_model, 'a', **PROFIL_A)
    b = _user(django_user_model, 'b', **PROFIL_B)
    comp = services.compatibilite(a.profil_locataire, b.profil_locataire)
    assert len(comp.explications) == len(services.POIDS_F4)
    total = sum(e.total for e in comp.explications)
    assert total == 100
    assert all(e.raison for e in comp.explications)


def test_f4_score_ordonne_suggestions(django_user_model):
    """Une jumelle de profil passe devant un profil divergent."""
    a = _user(django_user_model, 'a', **PROFIL_A)
    jumelle = _user(django_user_model, 'jumelle', **PROFIL_A)
    contraire = _user(django_user_model, 'contraire', ville='Gabès', fumeur=True)
    res = services.suggestions_de_colocataires(
        a.profil_locataire,
        [(jumelle, jumelle.profil_locataire), (contraire, contraire.profil_locataire)],
    )
    assert [u.username for u, _ in res][0] == 'jumelle'


# ---------- F4 : API ----------

def test_f4_suggestions_api(client, django_user_model):
    a = _user(django_user_model, 'a', **PROFIL_A)
    _user(django_user_model, 'jumelle', **PROFIL_A)
    client.force_authenticate(user=a)
    resp = client.get(reverse('coloc-suggestions'))
    assert resp.status_code == status.HTTP_200_OK
    s = resp.data['suggestions'][0]
    assert 0 <= s['score'] <= 100
    assert s['explications'] and 'critères_communs' in s


def test_f4_proposition_et_acceptation_creent_groupe(client, django_user_model):
    """US7.5 : accepter une proposition crée le groupe (acceptation mutuelle)."""
    a = _user(django_user_model, 'a', **PROFIL_A)
    b = _user(django_user_model, 'b', **PROFIL_B)
    client.force_authenticate(user=a)
    resp = client.post(reverse('coloc-propositions'), {'destinataire_id': b.pk}, format='json')
    assert resp.status_code == status.HTTP_201_CREATED
    prop_id = resp.data['id']

    # Le destinataire ne peut pas répondre avec le token de l'expéditeur
    resp = client.post(reverse('coloc-repondre', args=[prop_id]),
                       {'action': 'accepter'}, format='json')
    assert resp.status_code == status.HTTP_403_FORBIDDEN

    client.force_authenticate(user=b)
    resp = client.post(reverse('coloc-repondre', args=[prop_id]),
                       {'action': 'accepter'}, format='json')
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data['statut'] == 'acceptee'
    groupe_id = resp.data['groupe_id']
    assert MembreGroupe.objects.filter(groupe_id=groupe_id, statut='membre').count() == 2
    # L'expéditeur a reçu une notification (US9.4)
    assert Notification.objects.filter(user=a, type=Notification.Type.MATCHING).exists()


def test_f4_proposition_dupliquee_renvoie_existante(client, django_user_model):
    a = _user(django_user_model, 'a', **PROFIL_A)
    b = _user(django_user_model, 'b', **PROFIL_B)
    client.force_authenticate(user=a)
    r1 = client.post(reverse('coloc-propositions'), {'destinataire_id': b.pk}, format='json')
    r2 = client.post(reverse('coloc-propositions'), {'destinataire_id': b.pk}, format='json')
    assert r1.status_code == status.HTTP_201_CREATED and r2.status_code == status.HTTP_200_OK
    assert r1.data['id'] == r2.data['id']


def test_f4_refus(client, django_user_model):
    a = _user(django_user_model, 'a', **PROFIL_A)
    b = _user(django_user_model, 'b', **PROFIL_B)
    client.force_authenticate(user=a)
    prop_id = client.post(reverse('coloc-propositions'),
                          {'destinataire_id': b.pk}, format='json').data['id']
    client.force_authenticate(user=b)
    resp = client.post(reverse('coloc-repondre', args=[prop_id]), {'action': 'refuser'},
                       format='json')
    assert resp.data['statut'] == 'refusee'
    assert not GroupeColoc.objects.exists()


# ---------- Groupes (EPIC 8) ----------

def _groupe(a, b):
    g = GroupeColoc.objects.create(nom='Test', cree_par=a)
    MembreGroupe.objects.create(groupe=g, user=a)
    MembreGroupe.objects.create(groupe=g, user=b)
    return g


def test_groupe_invitation_acceptation(client, django_user_model):
    """US8.2 : le créateur invite, l'invité accepte et devient membre."""
    a = _user(django_user_model, 'a', **PROFIL_A)
    b = _user(django_user_model, 'b', **PROFIL_B)
    g = _groupe(a, b)
    c = _user(django_user_model, 'c', **PROFIL_A)
    client.force_authenticate(user=a)
    resp = client.post(reverse('groupe-inviter', args=[g.pk]), {'user_id': c.pk}, format='json')
    assert resp.status_code == status.HTTP_201_CREATED
    membre_id = resp.data['membre_id']

    client.force_authenticate(user=c)
    resp = client.post(reverse('groupe-invitation-repondre', args=[membre_id]),
                       {'action': 'accepter'}, format='json')
    assert resp.status_code == status.HTTP_200_OK
    assert MembreGroupe.objects.filter(groupe=g, user=c, statut='membre').exists()


def test_groupe_quitter_et_dissoudre(client, django_user_model):
    """US8.5 : un membre quitte ; seul le créateur dissout."""
    a = _user(django_user_model, 'a', **PROFIL_A)
    b = _user(django_user_model, 'b', **PROFIL_B)
    g = _groupe(a, b)
    client.force_authenticate(user=a)
    assert client.delete(reverse('groupe-detail', args=[g.pk])).status_code == 204

    g2 = _groupe(a, b)
    client.force_authenticate(user=b)
    # Le membre ne peut pas dissoudre
    assert client.delete(reverse('groupe-detail', args=[g2.pk])).status_code == 403
    # Mais il peut quitter
    assert client.post(reverse('groupe-quitter', args=[g2.pk])).status_code == 204
    assert not MembreGroupe.objects.filter(groupe=g2, user=b).exists()


# ---------- F5 : recommandations du groupe ----------

def test_f5_budget_combine(client, django_user_model, django_db_setup):
    """US8.4 : budget total = somme des budgets (450 + 500 = 950 DT, cf. cahier des charges)."""
    a = _user(django_user_model, 'a', **PROFIL_A)
    b = _user(django_user_model, 'b', **PROFIL_B)
    g = _groupe(a, b)
    client.force_authenticate(user=a)
    resp = client.get(reverse('groupe-recos', args=[g.pk]))
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data['profil_groupe']['budget_total'] == 950
    assert resp.data['profil_groupe']['nb_membres'] == 2
    assert 'groupe' in resp.data


def test_f5_acces_refuse_non_membre(client, django_user_model):
    a = _user(django_user_model, 'a', **PROFIL_A)
    b = _user(django_user_model, 'b', **PROFIL_B)
    g = _groupe(a, b)
    outsider = _user(django_user_model, 'out', **PROFIL_A)
    client.force_authenticate(user=outsider)
    assert client.get(reverse('groupe-recos', args=[g.pk])).status_code == 403


# ---------- Chat (US9.1–9.3) ----------

def test_chat_conversation_et_messages(client, django_user_model):
    """US9.1 : locataire → propriétaire, puis réponse, puis lecture."""
    from listings.models import Logement
    loc = _user(django_user_model, 'loc', **PROFIL_A)
    prop = django_user_model.objects.create_user(username='prop', password='x')
    log = Logement.objects.create(
        proprietaire=prop, type='appartement', titre='T2 Ariana', ville='Ariana',
        surface=60, chambres=2, sdb=1, prix=700, statut='actif',
    )
    client.force_authenticate(user=loc)
    resp = client.post(reverse('conversations'),
                       {'destinataire_id': prop.pk, 'logement_id': log.pk}, format='json')
    assert resp.status_code == status.HTTP_201_CREATED
    convo_id = resp.data['id']
    assert resp.data['type'] == 'direct'

    resp = client.post(reverse('conversation-messages', args=[convo_id]),
                       {'contenu': 'Bonjour, le logement est-il disponible ?'}, format='json')
    assert resp.status_code == status.HTTP_201_CREATED

    # Le destinataire voit la conversation et la notification (US9.4)
    client.force_authenticate(user=prop)
    convos = client.get(reverse('conversations')).data
    assert len(convos) == 1
    assert convos[0]['non_lus'] == 1
    notifs = client.get(reverse('notifications')).data
    assert notifs['non_lues'] >= 1

    # Polling : le locataire ne revoit pas ses propres messages comme non lus
    client.force_authenticate(user=loc)
    convos = client.get(reverse('conversations')).data
    assert convos[0]['non_lus'] == 0


def test_chat_conversation_privee(client, django_user_model):
    loc = _user(django_user_model, 'loc', **PROFIL_A)
    other = _user(django_user_model, 'other', **PROFIL_B)
    convo = Conversation.objects.create(type='direct')
    convo.participants.set([loc, other])
    outsider = _user(django_user_model, 'out', **PROFIL_A)
    client.force_authenticate(user=outsider)
    assert client.get(reverse('conversation-detail', args=[convo.pk])).status_code == 403


def test_chat_conversation_groupe(client, django_user_model):
    """US9.3 : une conversation de groupe relie les membres actifs."""
    a = _user(django_user_model, 'a', **PROFIL_A)
    b = _user(django_user_model, 'b', **PROFIL_B)
    g = _groupe(a, b)
    client.force_authenticate(user=a)
    resp = client.post(reverse('conversations'), {'groupe_id': g.pk}, format='json')
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.data['type'] == 'groupe'
    convo_id = resp.data['id']
    resp = client.post(reverse('conversation-messages', args=[convo_id]),
                       {'contenu': 'On visite samedi ?'}, format='json')
    assert resp.status_code == status.HTTP_201_CREATED
    client.force_authenticate(user=b)
    detail = client.get(reverse('conversation-detail', args=[convo_id])).data
    assert detail['messages'][-1]['contenu'] == 'On visite samedi ?'
    assert detail['conversation']['non_lus'] == 1


# ---------- Notifications (US9.4–9.6) ----------

def test_notifications_compteur_et_lecture(client, django_user_model):
    user = _user(django_user_model, 'aya')
    Notification.objects.create(user=user, type='systeme', titre='Bienvenue')
    Notification.objects.create(user=user, type='matching', titre='Match !')
    client.force_authenticate(user=user)
    data = client.get(reverse('notifications')).data
    assert data['non_lues'] == 2
    assert len(data['notifications']) == 2

    notif_id = data['notifications'][0]['id']
    client.patch(reverse('notification-lire', args=[notif_id]), {}, format='json')
    data = client.get(reverse('notifications')).data
    assert data['non_lues'] == 1

    client.post(reverse('notifications-lues'), {}, format='json')
    assert client.get(reverse('notifications')).data['non_lues'] == 0


def test_refresh_token_compte_supprime_renvoie_401(client, django_user_model):
    """Un refresh token émis puis supprimé (seed --reset) → 401, pas 500."""
    from rest_framework_simplejwt.tokens import RefreshToken

    user = django_user_model.objects.create_user(username='temporaire', password='x')
    refresh = str(RefreshToken.for_user(user))
    user.delete()
    resp = client.post(reverse('token_refresh'), {'refresh': refresh}, format='json')
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_notifications_isolees_entre_utilisateurs(client, django_user_model):
    a = _user(django_user_model, 'a')
    b = _user(django_user_model, 'b')
    notif_b = Notification.objects.create(user=b, type='systeme', titre='Privé')
    client.force_authenticate(user=a)
    # a ne voit pas les notifications de b, ne peut pas les marquer lues
    assert client.get(reverse('notifications')).data['non_lues'] == 0
    assert client.patch(reverse('notification-lire', args=[notif_b.pk]), {},
                        format='json').status_code == 404
