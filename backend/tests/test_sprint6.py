"""Sprint 6 — IA avancée : recherche en langage naturel (US6.1)."""
import pytest

from listings.services_nl import extraire_criteres

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize('phrase,attendu', [
    # Ville + type + budget + meublé + équipements dans UNE phrase
    (
        'Un appartement meublé à Ariana moins de 900 DT avec climatisation et wifi',
        {'ville': 'Ariana', 'type': 'appartement', 'prix_max': 900,
         'meuble': True, 'equipements': 'Climatisation,Wifi'},
    ),
    # Chambres + surface + disponibilité
    (
        '2 chambres à Sfax, 60 m2, disponible en septembre',
        {'ville': 'Sfax', 'chambres_min': 2, 'surface_min': 60,
         'disponible_a': '2026-09-01'},
    ),
    # Budget + équipements extérieurs
    (
        'une maison avec jardin et parking à La Marsa budget 1200 dt',
        {'ville': 'La Marsa', 'type': 'maison', 'prix_max': 1200,
         'equipements': 'Jardin,Parking'},
    ),
    # Non meublé + quartier
    (
        'studio non meuble près du lac 2',
        {'type': 'chambre', 'meuble': False, 'quartier': 'lac 2'},
    ),
])
def test_extraction_critères(phrase, attendu):
    """US6.1 : chaque phrase type produit exactement les filtres F1 attendus."""
    result = extraire_criteres(phrase)
    for cle, valeur in attendu.items():
        assert result['filtres'].get(cle) == valeur, \
            f'{phrase!r} → {cle}={result["filtres"].get(cle)!r} (attendu {valeur!r})'


def test_chaque_critère_est_expliqué():
    """F8 transversal : toute phrase comprise renvoie une explication par critère."""
    result = extraire_criteres('appartement à Tunis moins de 800 DT meublé')
    assert len(result['explications']) == len(result['filtres'])
    for exp in result['explications']:
        assert exp['source'], 'chaque critère doit expliquer d où il vient'


def test_phrase_incomprise_sans_critères():
    """Une phrase sans critère reconnu → aucun filtre (l écran affiche l aide)."""
    result = extraire_criteres('bonjour comment allez vous')
    assert result['filtres'] == {}


@pytest.mark.django_db
def test_endpoint_search_natural(client):
    """GET /search-natural/?q=… renvoie critères + résultats (accès visiteur)."""
    phrase = 'Un appartement meublé à Ariana moins de 20000 DT'
    r = client.get('/api/v1/search-natural/', {'q': phrase})
    assert r.status_code == 200
    data = r.json()
    assert data['requete'] == phrase
    assert data['interpretation_reussie'] is True
    assert any(c['critere'] == 'ville' for c in data['criteres'])
    assert any(c['critere'] == 'prix_max' for c in data['criteres'])
    assert isinstance(data['resultats'], list)


def test_endpoint_search_natural_phrase_courte(client):
    """Moins de 3 caractères → 400 explicite."""
    r = client.get('/api/v1/search-natural/', {'q': 'ab'})
    assert r.status_code == 400
    assert 'detail' in r.json()


def test_endpoint_search_natural_filtre_vraiment(client):
    """Les critères extraits filtrent réellement les annonces actives."""
    from accounts.models import CustomUser
    from listings.models import Logement

    proprio = CustomUser.objects.create_user(
        username='nl_proprio', password='x', email='nl@tn.tn',
        role='proprietaire', first_name='Nadia',
    )
    Logement.objects.create(
        proprietaire=proprio, type='appartement',
        titre='App Ariana clim', ville='Ariana', surface=70,
        chambres=2, sdb=1, prix=850, meuble=True, statut='actif',
    )
    Logement.objects.create(
        proprietaire=proprio, type='maison',
        titre='Maison Sfax', ville='Sfax', surface=120,
        chambres=4, sdb=2, prix=1500, meuble=False, statut='actif',
    )

    r = client.get('/api/v1/search-natural/',
                   {'q': 'appartement meublé à Ariana moins de 900 DT'})
    assert r.status_code == 200
    titres = [item['titre'] for item in r.json()['resultats']]
    assert 'App Ariana clim' in titres
    assert 'Maison Sfax' not in titres


# ---------- US5.1 — description assistée ----------

def test_description_assistee(client, django_user_model):
    """POST /describe-listing/ génère un brouillon à partir du formulaire."""
    user = django_user_model.objects.create_user(
        username='d1', password='x', role='proprietaire')
    client.force_authenticate(user=user)
    r = client.post('/api/v1/describe-listing/', {
        'type': 'appartement', 'ville': 'Ariana', 'quartier': 'Ennasr',
        'surface': 80, 'chambres': 2, 'sdb': 1, 'prix': 950, 'meuble': True,
        'etat': 'bon', 'equipements': ['Climatisation', 'Wifi'],
    }, format='json')
    assert r.status_code == 200
    desc = r.json()['description']
    assert 'Ariana' in desc and 'Ennasr' in desc
    assert '80 m' in desc and '950 DT' in desc
    assert 'meublé' in desc
    assert 'climatisation' in desc.lower() and 'wifi' in desc.lower()

def test_description_assistee_refuse_locataire(client, django_user_model):
    """US5.1 : réservé aux propriétaires."""
    user = django_user_model.objects.create_user(username='d2', password='x')
    client.force_authenticate(user=user)
    r = client.post('/api/v1/describe-listing/', {'surface': 50}, format='json')
    assert r.status_code == 403


# ---------- US5.3/US5.4/US5.6 — analyse des annonces ----------

def _annonce(proprio, **kwargs):
    from listings.models import Logement
    base = dict(
        proprietaire=proprio, type='appartement', titre='App Ariana',
        description='Bel appartement à Ariana avec climatisation et balcon.',
        ville='Ariana', surface=80, chambres=2, sdb=1, prix=950,
        meuble=True, statut='actif',
    )
    base.update(kwargs)
    return Logement.objects.create(**base)


def test_analyse_auto_a_la_soumission(client, django_user_model):
    """US5.4 (MUST) : le submit lance l'analyse et l'admin la voit."""
    from ai.models import AnnonceAnalyse
    user = django_user_model.objects.create_user(
        username='p1', password='x', role='proprietaire')
    logement = _annonce(user)
    client.force_authenticate(user=user)
    r = client.post(f'/api/v1/logements/{logement.id}/submit/')
    assert r.status_code == 200
    assert AnnonceAnalyse.objects.filter(logement=logement).exists()


def test_score_qualite_proprietaire(client, django_user_model):
    """US5.6 : le propriétaire consulte le score + points d'amélioration."""
    user = django_user_model.objects.create_user(
        username='p2', password='x', role='proprietaire')
    logement = _annonce(user)
    client.force_authenticate(user=user)
    client.post(f'/api/v1/logements/{logement.id}/submit/')
    r = client.get(f'/api/v1/logements/{logement.id}/qualite/')
    assert r.status_code == 200
    data = r.json()
    assert 0 <= data['score_qualite'] <= 100
    assert isinstance(data['points_faibles'], list)
    assert isinstance(data['incoherences'], list)


def test_qualite_interdite_autre_proprietaire(client, django_user_model):
    """Contrôle d'accès : un autre propriétaire ne voit pas le score."""
    p1 = django_user_model.objects.create_user(
        username='p3', password='x', role='proprietaire')
    p2 = django_user_model.objects.create_user(
        username='p4', password='x', role='proprietaire')
    logement = _annonce(p1)
    client.force_authenticate(user=p2)
    r = client.get(f'/api/v1/logements/{logement.id}/qualite/')
    assert r.status_code == 403


def test_incoherence_chambres_detectee():
    """US5.3 : « 3 chambres » dans le texte vs champ chambres=2 → incohérence."""
    from accounts.models import CustomUser
    from ai.services.analyse import detecter_incoherences
    user = CustomUser.objects.create_user(
        username='p5', password='x', role='proprietaire')
    logement = _annonce(
        user,
        description='Superbe appartement avec 3 chambres spacieuses à Ariana.',
        chambres=2,
    )
    incoherences, _ = detecter_incoherences(logement)
    codes = [i['code'] for i in incoherences]
    assert 'chambres_texte' in codes


def test_analyse_complete_coherente(client, django_user_model):
    """Annonce complète et cohérente → score élevé, 0 incohérence majeure."""
    import datetime
    import io

    from PIL import Image

    from ai.models import AnnonceAnalyse
    from listings.models import Equipement, Photo
    user = django_user_model.objects.create_user(
        username='p6', password='x', role='proprietaire')
    logement = _annonce(
        user,
        description=(
            'Bel appartement de 80 m² à Ariana, quartier Ennasr. '
            'Il dispose de 2 chambres, 1 salle de bain, entièrement meublé. '
            'Climatisation, wifi, balcon et lave-linge. Étage élevé avec ascenseur, '
            'proche des commerces et des transports. Visitable à tout moment.'
        ) * 2,
        quartier='Ennasr',
        disponible_de=datetime.date(2026, 9, 1),
    )
    for nom in ['Climatisation', 'Wifi', 'Balcon', 'Lave-linge', 'Ascenseur']:
        eq, _ = Equipement.objects.get_or_create(nom=nom)
        logement.equipements.add(eq)
    # 3 photos réelles ( Pillow ) pour le volet qualité
    for i in range(3):
        buf = io.BytesIO()
        Image.new('RGB', (64, 64), (120, 180, 200)).save(buf, format='JPEG')
        Photo.objects.create(logement=logement, image=f'logements/p6_{i}.jpg',
                             ordre=i)
    client.force_authenticate(user=user)
    client.post(f'/api/v1/logements/{logement.id}/submit/')
    analyse = AnnonceAnalyse.objects.get(logement=logement)
    assert analyse.score_qualite >= 70, analyse.score_qualite
    majeures = [i for i in analyse.incoherences if i['gravite'] == 'moyenne']
    assert majeures == [], majeures


def test_incoherences_admin(client, django_user_model):
    """US5.3 : l'admin voit la file des annonces avec incohérences."""
    from ai.models import AnnonceAnalyse
    admin = django_user_model.objects.create_user(
        username='adm6', password='x', role='admin')
    p = django_user_model.objects.create_user(
        username='p7', password='x', role='proprietaire')
    logement = _annonce(
        p, description='Appartement 3 chambres meublé.', chambres=1)
    AnnonceAnalyse.objects.create(
        logement=logement, score_qualite=40,
        incoherences=[{'code': 'chambres_texte', 'message': 'mismatch',
                       'gravite': 'moyenne'}],
    )
    client.force_authenticate(user=admin)
    r = client.get('/api/v1/admin/annonces/incoherences/')
    assert r.status_code == 200
    assert any(item['logement']['id'] == logement.id for item in r.json())


def test_prix_anormal_signale_admin(client, django_user_model):
    """US5.5/F7 : prix hors norme → flag + file admin, message non accusateur."""
    from ai.models import AnomalyFlag
    p = django_user_model.objects.create_user(
        username='p8', password='x', role='proprietaire')
    logement = _annonce(p, prix=25000)  # 25k DT vs ~900 DT de marché
    client.force_authenticate(user=p)
    r = client.post(f'/api/v1/logements/{logement.id}/analyze/')
    if r.status_code == 503:
        pytest.skip('Modèle F6 non entraîné')
    assert r.status_code == 201
    data = r.json()
    assert data['flag_anomalie'] is True
    assert 'fraude' not in data['message_anomalie'].lower()
    assert AnomalyFlag.objects.filter(logement=logement).exists()


# ---------- US6.4 — profil comportemental ----------

def test_enregistrer_recherche(client, django_user_model):
    """POST /recherches/ historise la recherche du locataire."""
    from ai.models import Recherche
    user = django_user_model.objects.create_user(username='c1', password='x')
    client.force_authenticate(user=user)
    r = client.post('/api/v1/recherches/', {
        'requete': 'appartement à Ariana',
        'filtres': {'ville': 'Ariana', 'prix_max': 900},
        'nb_resultats': 3,
    }, format='json')
    assert r.status_code == 201
    recherche = Recherche.objects.get(user=user)
    assert recherche.filtres['ville'] == 'Ariana'
    assert recherche.nb_resultats == 3


def test_bonus_comportemental_dans_reco(client, django_user_model):
    """US6.4 : une recherche récente sur une ville bonusse ses annonces (F8 explicit)."""
    from accounts.models import ProfilLocataire
    from listings.models import Equipement

    user = django_user_model.objects.create_user(username='c2', password='x')
    proprio = django_user_model.objects.create_user(
        username='p9', password='x', role='proprietaire')
    # Budget serré (900 < prix 950) : les scores restent < 100 pour mesurer le bonus
    ProfilLocataire.objects.create(user=user, budget_max=900)

    for ville in ['Ariana', 'Sfax']:
        ann = _annonce(proprio, ville=ville, titre=f'App {ville}')
        eq, _ = Equipement.objects.get_or_create(nom='Wifi')
        ann.equipements.add(eq)

    # Sans historique : ni Ariana ni Sfax ne portent le critère Comportement
    client.force_authenticate(user=user)
    r0 = client.get('/api/v1/recommendations/')
    assert r0.status_code == 200
    assert all(
        all(e['critere'] != 'Comportement' for e in item['explications'])
        for item in r0.json()['resultats']
    )

    # L utilisateur a recherché Sfax récemment
    client.post('/api/v1/recherches/', {'filtres': {'ville': 'Sfax'}}, format='json')

    r = client.get('/api/v1/recommendations/')
    par_ville = {item['logement']['ville']: item for item in r.json()['resultats']}
    sfax = par_ville['Sfax']
    ariana = par_ville['Ariana']
    assert any(e['critere'] == 'Comportement' for e in sfax['explications'])
    assert all(e['critere'] != 'Comportement' for e in ariana['explications'])
    assert sfax['score'] >= ariana['score']
