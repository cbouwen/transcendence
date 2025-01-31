# apps.py
from django.apps import AppConfig


class TetrisConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'tetris'

    def ready(self):
        import tetris.signals  # Import signal handlers
