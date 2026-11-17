"""Vues Sprint 5 — chat (US9.1–9.3) et notifications (US9.4–9.6).

Le temps réel n'est pas requis par le cahier des charges : le frontend
rafraîchit les messages par polling REST (GET conversations + GET messages).
"""
from django.contrib.auth import get_user_model
from django.db.models import Max
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Conversation, Message, Notification
from .serializers import (
    ConversationSerializer,
    MessageSerializer,
    NotificationSerializer,
)

User = get_user_model()


# ---------- Chat ----------

class ConversationsView(APIView):
    """GET : mes conversations (dernier message + compteur non lus).
    POST : ouvrir une conversation directe (destinataire_id) ou de groupe (groupe_id).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        convos = (Conversation.objects
                  .filter(participants=request.user)
                  .prefetch_related('participants', 'messages', 'groupe')
                  .annotate(dernier=Max('messages__created_at')))
        serializer = ConversationSerializer(convos, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        groupe_id = request.data.get('groupe_id')
        destinataire_id = request.data.get('destinataire_id')

        if groupe_id:
            # Conversation de groupe : réservée aux membres actifs (US9.3)
            membres = list(User.objects.filter(
                groupes_coloc__groupe_id=groupe_id, groupes_coloc__statut='membre'))
            if not membres:
                return Response({'detail': 'Groupe sans membre actif.'}, status=400)
            conv = (Conversation.objects
                    .filter(type=Conversation.Type.GROUPE, groupe_id=groupe_id)
                    .first())
            if conv is None:
                conv = Conversation.objects.create(type=Conversation.Type.GROUPE,
                                                   groupe_id=groupe_id)
                conv.participants.set(membres)
            if not conv.participants.filter(pk=request.user.pk).exists():
                return Response({'detail': 'Vous n’êtes pas membre de ce groupe.'}, status=403)
            return Response(ConversationSerializer(conv, context={'request': request}).data,
                            status=201)

        if not destinataire_id:
            return Response({'detail': 'destinataire_id ou groupe_id requis.'}, status=400)
        cible = generics.get_object_or_404(User, pk=destinataire_id)
        if cible.pk == request.user.pk:
            return Response({'detail': 'Conversation avec soi-même impossible.'}, status=400)

        # Réutilise la conversation directe existante s'il y en a une
        conv = (Conversation.objects
                .filter(type=Conversation.Type.DIRECT, participants=request.user)
                .filter(participants=cible)
                .first())
        if conv is None:
            conv = Conversation.objects.create(type=Conversation.Type.DIRECT)
            conv.participants.set([request.user, cible])
        return Response(ConversationSerializer(conv, context={'request': request}).data,
                        status=201)


class ConversationDetailView(APIView):
    """GET : détail d'une conversation + messages (polling, ?apres=<id>)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        convo = generics.get_object_or_404(
            Conversation.objects.prefetch_related('messages__expediteur'), pk=pk
        )
        if not convo.participants.filter(pk=request.user.pk).exists():
            return Response({'detail': 'Conversation privée.'}, status=403)
        qs = convo.messages.all()
        apres = request.query_params.get('apres')
        if apres and apres.isdigit():
            qs = qs.filter(pk__gt=int(apres))
        return Response({
            'conversation': ConversationSerializer(convo, context={'request': request}).data,
            'messages': MessageSerializer(qs[:200], many=True).data,
        })


class EnvoyerMessageView(APIView):
    """POST /conversations/{id}/messages — envoie un message (US9.1–9.3)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        convo = generics.get_object_or_404(Conversation, pk=pk)
        if not convo.participants.filter(pk=request.user.pk).exists():
            return Response({'detail': 'Conversation privée.'}, status=403)
        contenu = (request.data.get('contenu') or '').strip()
        if not contenu:
            return Response({'detail': 'Message vide.'}, status=400)
        message = Message.objects.create(conversation=convo, expediteur=request.user,
                                         contenu=contenu)
        message.lu_par.add(request.user)
        convo.updated_at = timezone.now()
        convo.save(update_fields=['updated_at'])

        # Notification pour les autres participants (US9.4)
        autres = convo.participants.exclude(pk=request.user.pk)
        Notification.objects.bulk_create([
            Notification(
                user=u, type=Notification.Type.MESSAGE,
                titre=f'Nouveau message de {request.user.first_name or request.user.username}',
                corps=contenu[:200], lien=f'/messages?conversation={convo.pk}',
            ) for u in autres
        ])
        return Response(MessageSerializer(message).data, status=201)


class MarquerConversationLueView(APIView):
    """POST /conversations/{id}/luer — marque tous les messages comme lus (compteur à 0)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        convo = generics.get_object_or_404(Conversation, pk=pk)
        if not convo.participants.filter(pk=request.user.pk).exists():
            return Response({'detail': 'Conversation privée.'}, status=403)
        for m in convo.messages.exclude(lu_par=request.user):
            m.lu_par.add(request.user)
        return Response({'ok': True})


# ---------- Notifications (US9.4–9.6) ----------

class NotificationsView(APIView):
    """GET : centre de notifications (?toutes=1 pour inclure les lues).
    PATCH : marquer une notification comme lue.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = request.user.notifications.all()
        non_lues = qs.filter(lue=False).count()
        if request.query_params.get('toutes') != '1':
            qs = qs.filter(lue=False)[:50]
        else:
            qs = qs[:50]
        return Response({
            'non_lues': non_lues,
            'notifications': NotificationSerializer(qs, many=True).data,
        })

    def patch(self, request, pk=None):
        notif = generics.get_object_or_404(Notification, pk=pk, user=request.user)
        notif.lue = True
        notif.save(update_fields=['lue'])
        return Response(NotificationSerializer(notif).data)


class ToutMarquerLuView(APIView):
    """POST /notifications/lues — marque toutes les notifications comme lues (US9.6)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        request.user.notifications.filter(lue=False).update(lue=True)
        return Response({'ok': True})
