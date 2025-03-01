from rest_framework_simplejwt.views import TokenRefreshView
from api.views import CustomTokenObtainPairView, CustomTokenObtainPuppetPairView
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from .views import Test, Me

urlpatterns = [
    path('token', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/puppet', CustomTokenObtainPuppetPairView.as_view(), name='token_obtain_puppet_pair'),
    path('test', Test.as_view(), name='test'),
    path('me', Me.as_view(), name='me'),
]
