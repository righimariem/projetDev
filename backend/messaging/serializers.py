"""Serializers Sprint 5 — conversations, messages, notifications."""
from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Conversation, Message, Notification

User = get_user_model()


class ParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']


class MessageSerializer(serializers.ModelSerializer):
    expediteur = ParticipantSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'expediteur', 'contenu', 'created_at']
        read_only_fields = fields


class ConversationSerializer(serializers.ModelSerializer):
    participants = ParticipantSerializer(many=True, read_only=True)
    dernier_message = serializers.SerializerMethodField()
    non_lus = serializers.SerializerMethodField()
    titre_groupe = serializers.CharField(source='groupe.nom', read_only=True, default=None)

    class Meta:
        model = Conversation
        fields = ['id', 'type', 'participants', 'groupe', 'titre_groupe', 'logement',
                  'dernier_message', 'non_lus', 'updated_at']
        read_only_fields = fields

    def get_dernier_message(self, obj):
        m = obj.messages.order_by('-created_at').first()
        if m is None:
            return None
        return {'expediteur': m.expediteur.username, 'contenu': m.contenu[:120],
                'created_at': m.created_at}

    def get_non_lus(self, obj):
        request = self.context.get('request')
        if request is None:
            return 0
        return obj.messages.exclude(lu_par=request.user).exclude(
            expediteur=request.user
        ).count()


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'type', 'titre', 'corps', 'lien', 'lue', 'created_at']
        read_only_fields = fields
