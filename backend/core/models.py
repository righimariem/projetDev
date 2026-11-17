from django.conf import settings
from django.db import models


class Favori(models.Model):
    """Favoris de l'utilisateur (US3.5)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='favoris'
    )
    logement = models.ForeignKey(
        'listings.Logement', on_delete=models.CASCADE, related_name='favorises_par'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'logement')

    def __str__(self):
        return f'{self.user.username} ♥ logement {self.logement_id}'


class Signalement(models.Model):
    """Signalement d'une annonce ou d'un comportement (US4.5, US4.6)."""

    class Cible(models.TextChoices):
        ANNONCE = 'annonce', 'Annonce'
        COMPTE = 'compte', 'Compte'

    class Statut(models.TextChoices):
        NOUVEAU = 'nouveau', 'Nouveau'
        TRAITE = 'traite', 'Traité'

    signaleur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='signalements_effectues'
    )
    cible_type = models.CharField(max_length=10, choices=Cible.choices)
    cible_id = models.PositiveIntegerField()
    motif = models.TextField()
    statut = models.CharField(max_length=10, choices=Statut.choices, default=Statut.NOUVEAU)
    traite_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='signalements_traites',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Signalement {self.pk} ({self.get_cible_type_display()} {self.cible_id})'
