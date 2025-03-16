from django.db import models
from django.contrib.auth.models import AbstractUser


class CustomUser(AbstractUser):
    totpsecret = models.CharField()
    avatar = models.ImageField(upload_to='avatars/', default='avatars/default.jpg', blank=True, null=True)

    def __str__(self):
        return self.username


from django.contrib.auth import get_user_model
User = get_user_model()

class PuppetGrant(models.Model):
    puppet = models.ForeignKey(User, on_delete=models.CASCADE, related_name="puppet_roles")
    puppeteer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="puppeteer_roles")
    expiry = models.DateTimeField()

