from django.urls import path
from .views import oauth_login, oauth_callback

urlpatterns = [
    path("login/", oauth_login, name="login"),
    path("login_callback/", oauth_callback, name="login_callback")
]
