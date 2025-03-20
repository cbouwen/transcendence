from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError

class ChatMessage(models.Model):
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    # A message can be sent to multiple users.
    recipients = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='received_messages'
    )
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        # Save the message first.
        super().save(*args, **kwargs)
        # Ensure the sender is also in the recipients list so they can read their own messages.
        if not self.recipients.filter(pk=self.sender.pk).exists():
            self.recipients.add(self.sender)

    def __str__(self):
        return f"From {self.sender} at {self.timestamp}"

class BlockedUser(models.Model):
    blocker = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='blocking'
    )
    blocked = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='blocked_by'
    )

    class Meta:
        unique_together = ('blocker', 'blocked')

    def clean(self):
        # Prevent a user from blocking themselves.
        if self.blocker == self.blocked:
            raise ValidationError("You cannot block yourself.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.blocker} blocked {self.blocked}"

class SystemMessage(models.Model):
    """
    Model for storing system messages directed at specific users.
    """
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="system_messages"
    )
    message_type = models.CharField(max_length=50, blank=True, null=True)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

