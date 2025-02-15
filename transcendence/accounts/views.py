from django.shortcuts import redirect
from django.conf import settings
from django.contrib.auth import authenticate, login
import requests
import urllib.parse

def LoginView(request):
    params = {
        'client_id': settings.FT_OAUTH_CLIENT_ID,
        'redirect_uri': settings.FT_OAUTH_REDIRECT_URI,
        'response_type': 'code',
    }
    url = f"{settings.FT_OAUTH_AUTHORIZE_URL}?{urllib.parse.urlencode(params)}"
    return redirect(url)
