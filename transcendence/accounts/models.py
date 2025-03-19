from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    totpsecret = models.CharField(max_length=255)
    friends = models.CharField(max_length=255)

    def avatar_upload_path(instance, filename):
        # Define the upload path and filename
        return f'avatar/{instance.username}.png'

    avatar = models.ImageField(upload_to=avatar_upload_path, default='avatar/default/default.png', blank=True, null=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username

from django.contrib.auth import get_user_model
User = get_user_model()

class PuppetGrant(models.Model):
    puppet = models.ForeignKey(User, on_delete=models.CASCADE, related_name="puppet_roles")
    puppeteer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="puppeteer_roles")
    expiry = models.DateTimeField()

