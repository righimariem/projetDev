from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    """Utilisateur HOMEY avec rôle (US1.1, US1.7)."""

    class Role(models.TextChoices):
        LOCATAIRE = 'locataire', 'Locataire'
        PROPRIETAIRE = 'proprietaire', 'Propriétaire'
        ADMIN = 'admin', 'Administrateur'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.LOCATAIRE)
    telephone = models.CharField(max_length=30, blank=True)
    # US4.2 : suspension/blocage par l'administrateur
    is_suspended = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def is_locataire(self):
        return self.role == self.Role.LOCATAIRE

    @property
    def is_proprietaire(self):
        return self.role == self.Role.PROPRIETAIRE


class ProfilLocataire(models.Model):
    """Préférences du locataire, utilisées par la recommandation (US1.6, F2/F3)."""

    class ModeRecherche(models.TextChoices):
        SEUL = 'seul', 'Seul'
        COLOC = 'coloc', 'Colocation'
        INDEFINI = 'indefini', 'Indécis'

    class Horaires(models.TextChoices):
        MATIN = 'matin', 'Matin'
        SOIR = 'soir', 'Soir'
        NUIT = 'nuit', 'Nuit'

    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='profil_locataire')
    # Critères logement (F2)
    budget_min = models.PositiveIntegerField(null=True, blank=True)
    budget_max = models.PositiveIntegerField(null=True, blank=True)
    ville = models.CharField(max_length=100, blank=True)
    quartier = models.CharField(max_length=100, blank=True)
    chambres_souhaitees = models.PositiveSmallIntegerField(null=True, blank=True)
    surface_min = models.PositiveIntegerField(null=True, blank=True)
    disponibilite = models.DateField(null=True, blank=True)
    # Équipements souhaités (F2) : libre texte séparé par des virgules
    equipements_desires = models.CharField(
        max_length=200, blank=True, help_text='ex. Wifi, Climatisation, Parking'
    )
    # Critères colocation (F3)
    mode_recherche = models.CharField(
        max_length=20, choices=ModeRecherche.choices, default=ModeRecherche.INDEFINI
    )
    veut_colocation = models.BooleanField(default=False)
    fumeur = models.BooleanField(default=False)
    animaux = models.BooleanField(default=False)
    niveau_proprete = models.PositiveSmallIntegerField(default=3)  # 1–5
    niveau_bruit = models.PositiveSmallIntegerField(default=3)  # 1–5
    horaires = models.CharField(max_length=10, choices=Horaires.choices, default=Horaires.SOIR)
    visiteurs = models.CharField(max_length=100, blank=True)
    habitudes = models.TextField(blank=True)

    def __str__(self):
        return f'Préférences de {self.user.username}'


class ProfilProprietaire(models.Model):
    """Profil du propriétaire (US2.x)."""

    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='profil_proprietaire')
    agence = models.CharField(max_length=150, blank=True)
    verifie = models.BooleanField(default=False)

    def __str__(self):
        return f'Propriétaire {self.user.username}'
