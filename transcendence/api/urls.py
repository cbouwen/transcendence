from rest_framework_simplejwt.views import TokenRefreshView
from api.views import CustomTokenObtainPairView
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from .views import Test
from .views import Me

urlpatterns = [
    path('token', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh', TokenRefreshView.as_view(), name='token_refresh'),
    path('test', Test.as_view(), name='test'),
    path('me', Me.as_view(), name='me'),
]
