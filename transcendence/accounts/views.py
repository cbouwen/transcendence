from django.shortcuts import redirect
from django.conf import settings
from django.contrib.auth import authenticate, login
import urllib.parse

def oauth_login(request):
    params = {
        'client_id': settings.FT_OAUTH_CLIENT_ID,
        'redirect_uri': settings.FT_OAUTH_REDIRECT_URI,
        'response_type': 'code',
    }
    url = f"{settings.FT_OAUTH_AUTHORIZE_URL}?{urllib.parse.urlencode(params)}"
    return redirect(url)

def oauth_callback(request):
    code = request.GET.get('code')
    if not code:
        return redirect('home')

    token_response = requests.post(settings.FT_OAUTH_TOKEN_URL, data={
        'client_id': settings.FT_OAUTH_CLIENT_ID,
        'client_secret': settings.FT_OAUTH_CLIENT_SECRET,
        'code': code,
        'grant_type': 'authorization_code',
        'redirect_uri': settings.FT_OAUTH_REDIRECT_URI,
    })

    if token_response.status_code != 200:
        return redirect('home')

    token_data = token_response.json()
    access_token = token_data.get('access_token')

    user = authenticate(request, token=access_token)
    if user:
        login(request, user)
        return redirect('home')
    return redirect('home')
