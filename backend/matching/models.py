"""Modèles Sprint 5 — Matching colocataire (F4) et groupes de colocation (EPIC 8)."""
from django.conf import settings
from django.db import models


class PropositionMatching(models.Model):
    """Proposition de matching entre deux locataires (US7.5).

    Une proposition acceptée crée automatiquement un groupe (acceptation mutuelle → groupe).
    """

    class Statut(models.TextChoices):
        EN_ATTENTE = 'en_attente', 'En attente'
        ACCEPTEE = 'acceptee', 'Acceptée'
        REFUSEE = 'refusee', 'Refusée'

    expediteur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='propositions_envoyees'
    )
    destinataire = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='propositions_recues'
    )
    score = models.PositiveSmallIntegerField(default=0)
    # Détail F4/F8 : [{"critere", "points", "points_max", "satisfait", "raison"}]
    explications = models.JSONField(default=list, blank=True)
    statut = models.CharField(max_length=15, choices=Statut.choices, default=Statut.EN_ATTENTE)
    groupe = models.ForeignKey(
        'GroupeColoc', on_delete=models.SET_NULL, null=True, blank=True, related_name='propositions'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    repondu_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('expediteur', 'destinataire')

    def __str__(self):
        return f'{self.expediteur.username} → {self.destinataire.username} ({self.statut})'


class GroupeColoc(models.Model):
    """Groupe de colocation (US8.1) — né d'un matching accepté ou créé directement."""

    nom = models.CharField(max_length=120, default='Notre colocation')
    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='groupes_crees'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.nom} (#{self.pk})'


class MembreGroupe(models.Model):
    """Membre d'un groupe : invité puis membre, ou membre direct (US8.2, US8.5)."""

    class Statut(models.TextChoices):
        INVITE = 'invite', 'Invité'
        MEMBRE = 'membre', 'Membre'

    groupe = models.ForeignKey(GroupeColoc, on_delete=models.CASCADE, related_name='membres')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='groupes_coloc'
    )
    statut = models.CharField(max_length=10, choices=Statut.choices, default=Statut.MEMBRE)
    invite_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='invitations_envoyees',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('groupe', 'user')

    def __str__(self):
        return f'{self.user.username} dans {self.groupe.nom} ({self.statut})'
