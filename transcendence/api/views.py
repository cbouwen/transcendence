from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import authenticate
from django.conf import settings
from django.shortcuts import redirect
from django.utils import timezone
from django.contrib.auth import get_user_model
import requests
import urllib.parse
from .serializers import UserSerializer
from accounts.models import PuppetGrant
from datetime import timedelta


User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request):
        # Get OAuth token from the request data
        ft_api_user_login_code = request.data.get("ft_api_user_login_code")
        if not ft_api_user_login_code:
            raise AuthenticationFailed('Please provide ft_api_user_login_code')
        totp = request.data.get("TOTP")
        if not totp:
            raise AuthenticationFailed('Please provide TOTP details')

        request_data = {
            'client_id': settings.FT_OAUTH_CLIENT_ID,
            'client_secret': settings.FT_OAUTH_CLIENT_SECRET,
            'code': ft_api_user_login_code,
            'grant_type': 'authorization_code',
            'redirect_uri': settings.FT_OAUTH_REDIRECT_URI,
        }
        token_response = requests.post(settings.FT_OAUTH_TOKEN_URL, data=request_data)

        if token_response.status_code != 200:
            error_data = token_response.json()
            error_data |= { 'type': "intra error" }
            raise AuthenticationFailed(error_data)

        token_data = token_response.json()
        access_token = token_data.get('access_token')



        if not access_token:
            raise AuthenticationFailed("42 OAuth access token is required.")

        # Authenticate user using the custom backend
        user = authenticate(request, token=access_token, totp=totp)

        # Generate JWT tokens
        if not user:
            return Response({
                            'error': str(user)
            })
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })


class CustomTokenObtainPuppetPairView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        username = request.data.get("username")
        if not username:
            raise AuthenticationFailed("Please provide a username.")

        try:
            puppet = User.objects.get(username=username)
        except User.DoesNotExist:
            raise AuthenticationFailed("User that you want to puppet is not found.")

        if not PuppetGrant.objects.filter(
            puppet=puppet,
            puppeteer=request.user,
            expiry__gt=timezone.now()
        ).exists():
            raise AuthenticationFailed("You don't have the user's permission to puppet them")

        refresh = RefreshToken.for_user(puppet)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        })


class CreatePuppetGrantView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        puppeteer_username = request.data.get("puppeteer")
        if not puppeteer_username:
            return Response({"error": "Puppeteer username is required."}, status=400)
        
        try:
            puppeteer = User.objects.get(username=puppeteer_username)
        except User.DoesNotExist:
            return Response({"error": "Puppeteer not found."}, status=404)
        
        expiry_time = timezone.now() + timedelta(minutes=1)
        
        puppet_grant = PuppetGrant.objects.create(
            puppet=request.user,
            puppeteer=puppeteer,
            expiry=expiry_time
        )
        
        return Response({
            "message": "Puppet grant created.",
            "puppet": request.user.username,
            "puppeteer": puppeteer.username,
            "expiry": puppet_grant.expiry
        }, status=201)


class Test(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        content = {'message': 'Test completed! You have successfully authenticated yourself and received access this super secret message'}
        return Response(content)

class Me(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        serializer = UserSerializer(user)
        userdata = serializer.data
        userdata.pop("totpsecret")
        userdata.pop("password")
        return Response(userdata)

    def post(self, request):
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User updated successfully", "user": serializer.data}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
