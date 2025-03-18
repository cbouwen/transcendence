import os
from pathlib import Path
from django.core.asgi import get_asgi_application
from whitenoise import WhiteNoise  # Now available with version 6+
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from chat import routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'transcendence.settings')
BASE_DIR = Path(__file__).resolve().parent.parent

# Get the Django ASGI application
django_asgi_app = get_asgi_application()

# Wrap with WhiteNoise for serving static files
django_asgi_app = WhiteNoise(django_asgi_app, root=str(BASE_DIR / 'staticfiles'))

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            routing.websocket_urlpatterns
        )
    ),
})
