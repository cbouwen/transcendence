import requests
from django.contrib.auth.backends import BaseBackend
from django.contrib.auth import get_user_model
from django.conf import settings
import sys
# import pyotp
import time

User = get_user_model()

class CustomAuthBackend(BaseBackend):
    def authenticate(self, token=None, totp=None):
        userinfo_url = settings.FT_OAUTH_USERINFO_URL
        try:
            response = requests.get(
                userinfo_url,
                headers={'Authorization': f'Bearer {token}'},
                timeout=5
            )
        except RequestException as e:
            print(f"Error while requesting authentication from 42 API: {e}", sys.stderr)
            return None

        if response.status_code == 200:
            user_data = response.json()
            username = user_data['login']

            user = User.objects.filter(username=username).first()

            if user is None:
                first_name = user_data['first_name']
                last_name = user_data['first_name']
                email = user_data['email']
                # if not totp.setup:
                #     return None
                totpsecret = totp.value.secret.base32
                user = User.objects.create(username=username, first_name=first_name, last_name=last_name, email=email, totpsecret=totpsecret)
            return user
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
