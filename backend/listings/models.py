from django.conf import settings
from django.db import models


class Equipement(models.Model):
    """Équipements filtrables (wifi, clim, parking…)."""

    nom = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name_plural = 'équipements'
        ordering = ['nom']

    def __str__(self):
        return self.nom


class Logement(models.Model):
    """Annonce de logement (EPIC 2, F1)."""

    class Type(models.TextChoices):
        APPARTEMENT = 'appartement', 'Appartement'
        MAISON = 'maison', 'Maison'
        CHAMBRE = 'chambre', 'Chambre'

    class Etat(models.TextChoices):
        NEUF = 'neuf', 'Neuf'
        BON = 'bon', 'Bon état'
        A_RENOVER = 'a_renover', 'À rénover'

    class Statut(models.TextChoices):
        BROUILLON = 'brouillon', 'Brouillon'
        EN_ATTENTE = 'en_attente', 'En attente de validation'
        ACTIF = 'actif', 'Actif'
        REFUSE = 'refuse', 'Refusé'
        LOUE = 'loue', 'Loué'
        ARCHIVE = 'archive', 'Archivé'

    proprietaire = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='logements'
    )
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.APPARTEMENT)
    titre = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    ville = models.CharField(max_length=100)
    quartier = models.CharField(max_length=100, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    surface = models.PositiveIntegerField()  # m²
    chambres = models.PositiveSmallIntegerField(default=1)
    sdb = models.PositiveSmallIntegerField(default=1)
    prix = models.PositiveIntegerField()  # DT/mois
    meuble = models.BooleanField(default=False)
    etat = models.CharField(max_length=20, choices=Etat.choices, default=Etat.BON)
    disponible_de = models.DateField(null=True, blank=True)
    disponible_jusqua = models.DateField(null=True, blank=True)
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.ACTIF)
    equipements = models.ManyToManyField(Equipement, blank=True, related_name='logements')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['ville', 'prix']),
            models.Index(fields=['chambres', 'surface']),
        ]

    def __str__(self):
        return f'{self.titre} — {self.ville} ({self.prix} DT)'


class ModerationDecision(models.Model):
    """Décision d'administration sur une annonce (US4.4) : accepté/refusé + justification."""

    class Decision(models.TextChoices):
        ACCEPTE = 'accepte', 'Accepté'
        REFUSE = 'refuse', 'Refusé'

    logement = models.ForeignKey(
        Logement, on_delete=models.CASCADE, related_name='decisions_moderation'
    )
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='decisions_moderation'
    )
    decision = models.CharField(max_length=10, choices=Decision.choices)
    justification = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.get_decision_display()} — logement {self.logement_id}'


class Photo(models.Model):
    """Photos du logement (US2.2)."""

    logement = models.ForeignKey(Logement, on_delete=models.CASCADE, related_name='photos')
    image = models.ImageField(upload_to='logements/%Y/%m/')
    ordre = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['ordre']

    def __str__(self):
        return f'Photo {self.pk} de {self.logement_id}'
