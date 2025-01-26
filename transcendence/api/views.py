from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import authenticate
from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import redirect
import requests
import urllib.parse

class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request):
        # Get OAuth token from the request data
        ft_api_user_login_code = request.data.get("ft_api_user_login_code")
        if not ft_api_user_login_code:
            raise AuthenticationFailed('Please provide ft_api_user_login_code')

        request_data = {
            'client_id': settings.FT_OAUTH_CLIENT_ID,
            'client_secret': settings.FT_OAUTH_CLIENT_SECRET,
            'code': ft_api_user_login_code,
            'grant_type': 'authorization_code',
            'redirect_uri': settings.FT_OAUTH_REDIRECT_URI,
        }
        token_response = requests.post(settings.FT_OAUTH_TOKEN_URL, data=request_data)

        if token_response.status_code != 200:
            raise AuthenticationFailed(token_response.json())

        token_data = token_response.json()
        access_token = token_data.get('access_token')



        if not access_token:
            raise AuthenticationFailed("42 OAuth access token is required.")

        # Authenticate user using the custom backend
        user = authenticate(request, token=access_token)
        if not user:
            raise AuthenticationFailed("Invalid 42 OAuth access token.")

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })


class Home(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        content = {'message': 'Hello, World!'}
        return Response(content)
