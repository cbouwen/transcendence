# serializers.py
from rest_framework import serializers
from .models import BlockedUser, ChatMessage, SystemMessage
from django.contrib.auth import get_user_model

User = get_user_model()

class ChatMessageSerializer(serializers.ModelSerializer):
    # Read-only sender (taken from request.user)
    sender = serializers.ReadOnlyField(source='sender.username')
    # Accept recipients as a list of usernames.
    recipients = serializers.SlugRelatedField(
        many=True,
        slug_field='username',
        queryset=User.objects.all()
    ) 
    class Meta:
        model = ChatMessage
        fields = ['id', 'sender', 'recipients', 'message', 'timestamp']

class BlockedUserSerializer(serializers.ModelSerializer):
    # The blocker is read-only and derived from request.user.
    blocker = serializers.ReadOnlyField(source='blocker.username')
    # The blocked field expects a username.
    blocked = serializers.SlugRelatedField(
        slug_field='username',
        queryset=User.objects.all()
    )
    class Meta:
        model = BlockedUser
        fields = ['id', 'blocker', 'blocked']

class SystemMessageSerializer(serializers.ModelSerializer):
    # Allow recipient to be set by username when creating a message.
    recipient = serializers.SlugRelatedField(
        slug_field='username',
        queryset=User.objects.all()
    )

    class Meta:
        model = SystemMessage
        fields = ['id', 'recipient', 'message_type', 'content', 'timestamp', 'is_read']
