import requests
from django.contrib.auth.backends import BaseBackend
from django.contrib.auth import get_user_model
from django.conf import settings
import sys

import base64
import numpy as np
from scipy.stats import entropy

User = get_user_model()

def is_strong_secret(secret, min_entropy=4.5):
    """Check if the secret has sufficient entropy"""
    values, counts = np.unique(list(secret), return_counts=True)
    ent = entropy(counts, base=2)
    return ent >= min_entropy

class CustomAuthBackend(BaseBackend):
    def authenticate(self, request, otp_code=None, otp_secret=None, token=None):
        userinfo_url = settings.FT_OAUTH_USERINFO_URL
        try:
            response = requests.get(
                userinfo_url,
                headers={'Authorization': f'Bearer {token}'},
                timeout=5
            )
        except RequestException as e:
            raise Exception(f"Error while requesting authentication from 42 API: {e}", sys.stderr)
            return None

        if response.status_code == 200:
            user_data = response.json()
            username = user_data['login']

            user = User.objects.filter(username=username).first()

            if user is None:
                first_name = user_data['first_name']
                last_name = user_data['last_name']
                email = user_data['email']
                otp_secret = user_data['otp_secret']
                if is_strong_secret(otp_secret): 
                    user = User.objects.create(username=username, first_name=first_name, last_name=last_name, email=email, otp_secret=otp_secret)
            return user
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
