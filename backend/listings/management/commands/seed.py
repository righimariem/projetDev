import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import CustomUser, ProfilLocataire, ProfilProprietaire
from listings.models import Equipement, Logement

EQUIPEMENTS = [
    'Wifi', 'Climatisation', 'Chauffage', 'Parking', 'Ascenseur', 'Meublé',
    'Machine à laver', 'Gardiennage', 'Balcon', 'Jardin', 'Piscine', 'TV',
]

# Villes réalistes (Tunisie) avec fourchettes de prix
VILLES = {
    'Tunis': (500, 1600), 'Ariana': (450, 1200), 'La Marsa': (700, 2200),
    'Sfax': (300, 900), 'Sousse': (400, 1300), 'Monastir': (350, 1000),
    'Bizerte': (300, 850), 'Gabès': (250, 700), 'Nabeul': (350, 1100),
    'Djerba': (500, 1800),
}
QUARTIERS = ['Centre', 'Résidence Les Pins', 'Boulevard Principal', 'Cité El Wafa',
             'Route de l Auditorium', 'Résidence Ennasr', 'Sidi Bou Said']
TITRES = [
    'Appartement lumineux', 'Studio meublé', 'Grand T3 avec balcon',
    'Maison familiale', 'Appartement rénové', 'Duplex moderne',
    'Chambre cosy', 'T2 calme et confortable',
]
DESCRIPTIONS = [
    'Logement lumineux, proche des commerces et des transports.',
    'Cadre tranquille, idéal pour étudiant ou jeune actif.',
    'Rénové avec goût, tout équipé, prêt à vivre.',
    'Grandes pièces, double exposition, beaucoup de rangement.',
]


class Command(BaseCommand):
    help = 'Remplit la base avec des données de démonstration (utilisateurs + 50 logements).'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true', help='Supprime les données créées.')

    def handle(self, *args, **options):
        random.seed(42)  # données reproductibles
        if options['reset']:
            CustomUser.objects.filter(username__startswith='demo_').delete()
            self.stdout.write('Données demo supprimées.')

        equipements = [
            Equipement.objects.get_or_create(nom=nom)[0] for nom in EQUIPEMENTS
        ]

        users = self._create_users()
        # demo_locataire publie aussi, pour avoir des annonces de profils variés
        proprietaires = [users['demo_locataire'], users['demo_proprietaire'], users['demo_proprietaire2']]

        count = Logement.objects.count()
        if count >= 50:
            self.stdout.write(self.style.WARNING('50 logements déjà présents, seed ignoré.'))
            return

        for i in range(50):
            ville, (prix_min, prix_max) = random.choice(list(VILLES.items()))
            surface = random.randint(20, 220)
            chambres = max(1, surface // 35)
            logement = Logement.objects.create(
                proprietaire=random.choice(proprietaires),
                type=random.choice([c[0] for c in Logement.Type.choices]),
                titre=f'{random.choice(TITRES)} à {ville}',
                description=random.choice(DESCRIPTIONS),
                ville=ville,
                quartier=random.choice(QUARTIERS),
                surface=surface,
                chambres=chambres,
                sdb=max(1, chambres // 2),
                prix=random.randint(prix_min, prix_max),
                meuble=random.random() > 0.5,
                etat=random.choice([c[0] for c in Logement.Etat.choices]),
                disponible_de=(timezone.now() + timedelta(days=random.randint(0, 60))).date(),
                statut=Logement.Statut.ACTIF,
            )
            logement.equipements.set(random.sample(equipements, random.randint(2, 6)))

        # Statuts variés pour tester le Sprint 3 dès le seed (démo propriétaire)
        self._appliquer_statuts_demo()

        self.stdout.write(
            self.style.SUCCESS(f'Seed terminé : {Logement.objects.count()} logements.')
        )

    def _appliquer_statuts_demo(self):
        """Une annonce en attente, une refusée et une louée de demo_proprietaire (démo Sprint 3)."""
        proprio = CustomUser.objects.get(username='demo_proprietaire')
        annonces = list(Logement.objects.filter(proprietaire=proprio)[:3])
        if len(annonces) == 3:
            annonces[0].statut = Logement.Statut.EN_ATTENTE
            annonces[0].save(update_fields=['statut'])
            annonces[1].statut = Logement.Statut.REFUSE
            annonces[1].save(update_fields=['statut'])
            annonces[2].statut = Logement.Statut.LOUE
            annonces[2].save(update_fields=['statut'])

    def _create_users(self):
        """Comptes de démo — mot de passe commun : homey2026."""
        specs = [
            ('demo_locataire', 'locataire', 'Aya', 'Ben Ali'),
            ('demo_locataire2', 'locataire', 'Yasmine', 'Trabelsi'),
            ('demo_proprietaire', 'proprietaire', 'Karim', 'Saidi'),
            ('demo_proprietaire2', 'proprietaire', 'Nadia', 'Gharbi'),
            ('demo_admin', 'admin', 'Ridha', 'Ben Amor'),
        ]
        users = {}
        for username, role, first, last in specs:
            user, created = CustomUser.objects.get_or_create(
                username=username,
                defaults={
                    'email': f'{username}@homey.tn',
                    'first_name': first,
                    'last_name': last,
                    'role': role,
                },
            )
            if created:
                user.set_password('homey2026')
                if role == 'admin':
                    user.is_staff = True
                user.save()
                if role == 'locataire':
                    ProfilLocataire.objects.get_or_create(
                        user=user,
                        defaults=self._prefs_coloc(username),
                    )
                else:
                    ProfilProprietaire.objects.get_or_create(user=user)
            users[username] = user
        return users

    def _prefs_coloc(self, username):
        """Préférences F3 réalistes pour la démo de matching F4 (Sprint 5)."""
        base = {'ville': 'Ariana', 'budget_max': 900, 'fumeur': False,
                'mode_recherche': 'coloc', 'veut_colocation': True}
        profils = {
            'demo_locataire': {**base, 'budget_max': 450, 'animaux': False,
                               'niveau_proprete': 4, 'niveau_bruit': 2,
                               'horaires': 'soir', 'visiteurs': 'occasionnel',
                               'habitudes': 'calme, études, cuisine'},
            # Yasmine : profil quasi identique → compatibilité élevée attendue (F4)
            'demo_locataire2': {**base, 'budget_max': 500, 'animaux': False,
                                'niveau_proprete': 4, 'niveau_bruit': 2,
                                'horaires': 'soir', 'visiteurs': 'occasionnel',
                                'habitudes': 'calme, études, sport'},
        }
        return profils.get(username, base)
