from rest_framework_simplejwt.views import TokenRefreshView
from api.views import CustomTokenObtainPairView
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from .views import Test
from .views import Me
from .views import tetris_get_next_match
from .views import tetris_save_tetris_scores
from .views import tetris_add_player
from .views import tetris_remove_player

urlpatterns = [
    path('token', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh', TokenRefreshView.as_view(), name='token_refresh'),
    path('test', Test.as_view(), name='test'),
    path('me', Me.as_view(), name='me'),

    path('tetris/save-tetris-scores', tetris_save_tetris_scores.as_view(), name='save_tetris_scores'),

    path('tetris/next-match', tetris_get_next_match.as_view(), name='next_match'),
    path('tetris/add-player', tetris_add_player.as_view(), name='add_player'),
    path('tetris/remove-player', tetris_remove_player.as_view(), name='remove_player'),
]
