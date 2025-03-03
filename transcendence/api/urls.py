from rest_framework_simplejwt.views import TokenRefreshView
from api.views import CustomTokenObtainPairView
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from .views import Test, tournament_add_player, tournament_cancel_tournament, tournament_declare_game, tournament_generate_round, tournament_get_current_match, tournament_remove_player, tournament_start, tournament_update_match
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

    path('tetris/save-tetris-scores', tetris_save_tetris_scores.as_view(),
         name='save_tetris_scores'),

    path('tetris/next-match', tetris_get_next_match.as_view(), name='next_match'),
    path('tetris/add-player', tetris_add_player.as_view(), name='add_player'),
    path('tetris/get-player', tetris_get_player.as_view(), name='get_player'),
    path('tetris/remove-player', tetris_remove_player.as_view(), name='remove_player'),

    path('tournament/add_player', tournament_add_player.as_view(), name='to_add_player'),
    path('tournament/remove_player', tournament_remove_player.as_view(), name='to_remove_player'),
    path('tournament/start', tournament_start.as_view(), name='to_start'),
    path('tournament/generate_round', tournament_generate_round.as_view(),
         name='to_generate_round'), 
    path('tournament/update_match', tournament_update_match.as_view(), name='to_update_match'),
    path('tournament/get_current_match', tournament_get_current_match.as_view(),
         name='to_get_current_match'),
    path('tournament/cancel_tournament', tournament_cancel_tournament.as_view(),
         name='to_cancel_tournament'),
    path('tournament/declare_game', tournament_declare_game.as_view(), name='to_declare_tournament'),
]
