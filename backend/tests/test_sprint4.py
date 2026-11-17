"""Tests Sprint 4 : F6 estimation, F7 anomalies, F2/F8 recommandations expliquées."""
import pytest
from django.urls import reverse
from rest_framework import status

from accounts.models import ProfilLocataire
from listings.models import Logement
from ml.datasets import synthetic
from ml.training import scan_f7, train_f6

pytestmark = pytest.mark.django_db


# ---------- Métriques du modèle (critères du plan) ----------

def test_dataset_synthétique_reproductible():
    df1 = synthetic.generer(300, seed=7)
    df2 = synthetic.generer(300, seed=7)
    assert df1['prix'].tolist() == df2['prix'].tolist()


def test_modele_f6_atteint_cibles():
    """Critères du plan : MAE < 12 % du prix médian ET R² > 0.7."""
    df = synthetic.generer(1200, seed=42)
    meta = train_f6.entrainer(df)
    assert meta['mae_pct_median'] < 12, meta
    assert meta['r2'] > 0.7, meta
    assert train_f6.accepte(meta)


def test_features_completes():
    df = synthetic.generer(50, seed=1)
    feats = train_f6.construire_features(df)
    assert list(feats.columns) == train_f6.FEATURES_CAT + train_f6.FEATURES_NUM
    assert feats['meuble'].isin([0, 1]).all()


# ---------- Endpoint F6 ----------

def test_estimate_price_requiert_auth(client):
    resp = client.post(reverse('estimate-price'), {'ville': 'Tunis', 'surface': 60}, format='json')
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED


def test_estimate_price_valide_surface(client, django_user_model):
    user = django_user_model.objects.create_user(username='aya', password='x')
    client.force_authenticate(user=user)
    resp = client.post(reverse('estimate-price'), {'surface': -5}, format='json')
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_estimate_price_renvoie_intervalle(client, django_user_model):
    """Réponse : prix_estime, fourchette, métriques du modèle."""
    user = django_user_model.objects.create_user(username='aya', password='x')
    client.force_authenticate(user=user)
    resp = client.post(reverse('estimate-price'), {
        'ville': 'Ariana', 'surface': 100, 'chambres': 2, 'sdb': 1,
        'type': 'appartement', 'meuble': True, 'etat': 'bon', 'nb_equipements': 5,
    }, format='json')
    if resp.status_code == status.HTTP_503_SERVICE_UNAVAILABLE:
        pytest.skip('Modèle non entraîné dans cet environnement')
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data['prix_estime'] > 0
    assert resp.data['intervalle_bas'] <= resp.data['prix_estime'] <= resp.data['intervalle_haut']
    assert resp.data['metriques']['r2'] is not None


def test_estimate_ordonne_grandeur(client, django_user_model):
    """100 m² doit coûter plus cher que 30 m², toutes égales par ailleurs."""
    user = django_user_model.objects.create_user(username='aya', password='x')
    client.force_authenticate(user=user)
    base = {'ville': 'Ariana', 'chambres': 2, 'sdb': 1, 'type': 'appartement',
            'meuble': True, 'etat': 'bon', 'nb_equipements': 3}
    r1 = client.post(reverse('estimate-price'), {**base, 'surface': 30}, format='json')
    r2 = client.post(reverse('estimate-price'), {**base, 'surface': 100}, format='json')
    if r1.status_code == status.HTTP_503_SERVICE_UNAVAILABLE:
        pytest.skip('Modèle non entraîné')
    assert r2.data['prix_estime'] > r1.data['prix_estime']


# ---------- F7 anomalies ----------

def test_scan_detecte_prix_aberrant():
    """Un prix 10× au-dessus du marché doit être signalé ; un prix normal, non."""
    df = synthetic.generer(400, seed=3)
    prix_normal = int(df['prix'].median())
    import pandas as pd
    df = pd.concat([df, pd.DataFrame([{
        'ville': 'Ariana', 'type': 'chambre', 'etat': 'a_renover', 'meuble': False,
        'surface': 45, 'chambres': 1, 'sdb': 1, 'nb_equipements': 0,
        'age_annonces_ville': 30.0, 'prix': prix_normal * 10,
    }])], ignore_index=True)

    modele = train_f6.entrainer(df)  # entraîne + sauvegarde pour la prédiction
    assert modele['r2'] > 0.7

    import joblib

    from ml.training.train_f6 import construire_features
    m = joblib.load(train_f6.chemin_modele())
    feats = construire_features(df)
    flags = scan_f7.detecter_anomalies(df, lambda d: m.predict(feats))

    assert len(flags) >= 1
    assert flags[-1]['prix'] == prix_normal * 10
    # Message non accusateur (règle du cahier des charges)
    assert 'vérification' in flags[-1]['motif'].lower()


def test_scan_sans_anomalie_si_donnees_normales():
    """Avec un modèle entraîné sur des données propres, aucun faux positif."""
    import joblib

    from ml.training.train_f6 import construire_features

    # Modèle propre : entraîné UNIQUEMENT sur des données sans outlier
    train_f6.entrainer(synthetic.generer(800, seed=11))
    m = joblib.load(train_f6.chemin_modele())

    df = synthetic.generer(400, seed=5)
    feats = construire_features(df)
    flags = scan_f7.detecter_anomalies(df, lambda d: m.predict(feats))
    assert flags == [], f"Faux positifs : {flags[:3]}"


def test_price_check_une_annonce(client, django_user_model):
    proprio = django_user_model.objects.create_user(username='karim', password='x', role='proprietaire')
    logement = Logement.objects.create(
        proprietaire=proprio, titre='T2', ville='Ariana', prix=700, surface=65,
        chambres=2, sdb=1, statut=Logement.Statut.ACTIF,
    )
    user = django_user_model.objects.create_user(username='aya', password='x')
    client.force_authenticate(user=user)
    resp = client.get(reverse('price-check', args=[logement.pk]))
    if resp.status_code == status.HTTP_503_SERVICE_UNAVAILABLE:
        pytest.skip('Modèle non entraîné')
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data['prix_demande'] == 700
    assert 'ecart_pct' in resp.data


# ---------- F2 / F8 recommandations ----------

@pytest.fixture
def profil(django_user_model):
    user = django_user_model.objects.create_user(username='aya', password='x', role='locataire')
    return ProfilLocataire.objects.create(
        user=user, ville='Ariana', budget_max=900, chambres_souhaitees=2,
    )


@pytest.fixture
def logements(django_user_model):
    proprio = django_user_model.objects.create_user(username='karim', password='x', role='proprietaire')
    specs = [
        ('Parfait pour Aya', 'Ariana', 700, 2, 70, 'actif'),      # correspond
        ('Trop cher', 'Ariana', 2500, 2, 70, 'actif'),            # hors budget
        ('Mauvaise ville', 'Sfax', 600, 2, 70, 'actif'),          # hors ville
        ('Non actif', 'Ariana', 650, 2, 70, 'en_attente'),        # exclu du queryset
    ]
    objs = []
    for titre, ville, prix, ch, surf, statut in specs:
        objs.append(Logement.objects.create(
            proprietaire=proprio, titre=titre, ville=ville, prix=prix,
            chambres=ch, surface=surf, statut=statut,
        ))
    return objs


def test_reco_requiert_auth(client):
    assert client.get(reverse('recommendations')).status_code == status.HTTP_401_UNAUTHORIZED


def test_reco_classe_les_compatibles_dabord(client, profil, logements):
    client.force_authenticate(user=profil.user)
    resp = client.get(reverse('recommendations'))
    assert resp.status_code == status.HTTP_200_OK
    resultats = resp.data['resultats']
    assert resultats[0]['logement']['titre'] == 'Parfait pour Aya'
    # L'annonce non active n'apparaît jamais
    titres = [r['logement']['titre'] for r in resultats]
    assert 'Non actif' not in titres


def test_reco_score_bonne_compatibilite(client, profil, logements):
    client.force_authenticate(user=profil.user)
    resp = client.get(reverse('recommendations'))
    top = resp.data['resultats'][0]
    assert top['score'] >= 75  # bon match attendu (ville+budget+chambres OK)


def test_reco_explique_chaque_reco(client, profil, logements):
    """F8 : chaque recommandation porte score + explications détaillées (US6.3)."""
    client.force_authenticate(user=profil.user)
    resp = client.get(reverse('recommendations'))
    for r in resp.data['resultats']:
        assert 'score' in r and 'explications' in r
        assert len(r['explications']) >= 5
        for e in r['explications']:
            assert set(e) >= {'critere', 'points', 'points_max', 'satisfait', 'raison'}
        # Critères uniques (clés React sans doublon)
        criteres = [e['critere'] for e in r['explications']]
        assert len(criteres) == len(set(criteres)), f'Critères dupliqués : {criteres}'
        assert 'Type' in criteres and 'Meublé' in criteres
        # Le top doit avoir des raisons positives (« pourquoi »)
    assert resp.data['resultats'][0]['pourquoi'], 'Le top doit justifier sa recommandation'


def test_reco_ordonne_par_score(client, profil, logements):
    client.force_authenticate(user=profil.user)
    resp = client.get(reverse('recommendations'))
    scores = [r['score'] for r in resp.data['resultats']]
    assert scores == sorted(scores, reverse=True)
