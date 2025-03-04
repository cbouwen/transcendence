from django.db import models
from django.contrib.auth import get_user_model


User = get_user_model()

class PuppetGrant(models.Model):
    puppet = models.ForeignKey(User, on_delete=models.CASCADE, related_name="puppet_roles")
    puppeteer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="puppeteer_roles")
    expiry = models.DateTimeField()

    def __str__(self):
        return f"{self.puppeteer} is allowed to puppet {self.puppet} until {self.expiry}"
