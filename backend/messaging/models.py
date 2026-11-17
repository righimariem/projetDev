"""Modèles Sprint 5 — Communication : chat (US9.1–9.3) et notifications (US9.4–9.6)."""
from django.conf import settings
from django.db import models


class Conversation(models.Model):
    """Conversation directe entre deux utilisateurs (US9.1, US9.2)
    ou conversation de groupe liée à un groupe de colocation (US9.3).
    """

    class Type(models.TextChoices):
        DIRECT = 'direct', 'Directe'
        GROUPE = 'groupe', 'Groupe'

    type = models.CharField(max_length=10, choices=Type.choices, default=Type.DIRECT)
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name='conversations', blank=True
    )
    # Conversation de groupe : liée au groupe de colocation concerné
    groupe = models.ForeignKey(
        'matching.GroupeColoc', on_delete=models.CASCADE, null=True, blank=True,
        related_name='conversations',
    )
    # Contexte optionnel : conversation ouverte depuis une annonce (US3.6/US9.1)
    logement = models.ForeignKey(
        'listings.Logement', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='conversations',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'{self.get_type_display()} #{self.pk}'


class Message(models.Model):
    """Message de chat (US9.1–9.3), lu ou non par chaque participant."""

    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name='messages'
    )
    expediteur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='messages_envoyes'
    )
    contenu = models.TextField()
    lu_par = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name='messages_lus', blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.expediteur.username}: {self.contenu[:40]}'


class Notification(models.Model):
    """Notification utilisateur (US9.4–9.6) : matching, invitation, message, annonce…"""

    class Type(models.TextChoices):
        MATCHING = 'matching', 'Matching'
        INVITATION = 'invitation', 'Invitation groupe'
        MESSAGE = 'message', 'Message'
        ANNONCE = 'annonce', 'Annonce'
        SYSTEME = 'systeme', 'Système'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications'
    )
    type = models.CharField(max_length=15, choices=Type.choices, default=Type.SYSTEME)
    titre = models.CharField(max_length=200)
    corps = models.TextField(blank=True)
    # Lien interne optionnel (ex. /messages, /colocation)
    lien = models.CharField(max_length=200, blank=True)
    lue = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.user.username}] {self.titre}'
