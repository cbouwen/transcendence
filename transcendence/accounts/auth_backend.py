import requests
from django.contrib.auth.backends import BaseBackend
from django.contrib.auth import get_user_model
from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed
import sys
import logging
import pyotp
import time

User = get_user_model()

class CustomAuthBackend(BaseBackend):
    def authenticate(self, request, token=None, totp=None):
        userinfo_url = settings.FT_OAUTH_USERINFO_URL
        response = requests.get(
            userinfo_url,
            headers={'Authorization': f'Bearer {token}'},
            timeout=5
        )

        if response.status_code == 200:
            user_data = response.json()
            username = user_data['login']

            user = User.objects.filter(username=username).first()
            totp_type = totp.get("type", {})
            totp_value = totp.get("value", {})
            if user is None:
                if (totp_type == "setup"):
                    first_name = user_data['first_name']
                    last_name = user_data['first_name']
                    email = user_data['email']
                    totpsecret = totp_value.get("secret", {}).get("base32")
                    user = User.objects.create(username=username, first_name=first_name, last_name=last_name, email=email, totpsecret=totpsecret)
                else:
                    raise AuthenticationFailed("You need to set up 2FA first")
            else:
                if (totp_type == "token"):
                    if pyotp.TOTP(user.totpsecret).verify(totp_value):
                        pass
                    else:
                        raise AuthenticationFailed("Invalid 2FA code")
                else:
                    raise AuthenticationFailed("Please provide your 2FA code")
            return user
        else:
            raise AuthenticationFailed("intra call failed", response)

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
