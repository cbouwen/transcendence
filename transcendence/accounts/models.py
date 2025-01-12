from django.contrib.auth.models import AbstractUser
from django.core.validators import FileExtensionValidator
from django.db import models

class CustomUser(AbstractUser):
    avatar = models.ImageField(
        upload_to='avatars/',
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'png'])],
        null=True,
        blank=True,
        default='avatars/default.png'
    )

    def __str__(self):
        return self.username
