from rest_framework_simplejwt.views import TokenRefreshView
from api.views import CustomTokenObtainPairView
from django.urls import path, include
from .views import Home

urlpatterns = [
    path('token', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh', TokenRefreshView.as_view(), name='token_refresh'),
    path('test', Home.as_view()),
]
