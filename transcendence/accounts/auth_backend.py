import requests
from django.contrib.auth.backends import BaseBackend
from django.contrib.auth.models import User


class CustomAuthBackend(BaseBackend):
    def authenticate(self, request, token=None):
        userinfo_url = getattr(settings, 'FT_OAUTH_USERINFO_URL')
        response = requests.get(userinfo_url, headers={'Authorization': f'Bearer {token}'})

        if response.status_code == 200:
            user_data = response.json()
            username = user_data['username']

            user = User.objects.get_or_create(username=username)
            return user
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
