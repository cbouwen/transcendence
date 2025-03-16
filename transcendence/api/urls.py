from rest_framework_simplejwt.views import TokenRefreshView
from api.views import CustomTokenObtainPairView, CustomTokenObtainPuppetPairView, CreatePuppetGrantView, Me, Test
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from .views import Test, get_game_id, tetris_get_active_players, tetris_get_player, tournament_add_player, tournament_cancel_tournament, tournament_declare_game, tournament_generate_round, tournament_get_current_match, tournament_get_game, tournament_get_participants, tournament_ping, tournament_remove_player, tournament_start, tournament_update_match
from .views import Me
from .views import tetris_get_next_match
from .views import tetris_save_tetris_scores
from .views import tetris_add_player
from .views import tetris_remove_player
from .views import PongScoreView

urlpatterns = [
    path('token', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/puppet', CustomTokenObtainPuppetPairView.as_view(), name='token_obtain_puppet_pair'),
    path('token/grant', CreatePuppetGrantView.as_view(), name='create_puppet_grant'),
    path('test', Test.as_view(), name='test'),
    path('me', Me.as_view(), name='me'),

    path('pong/score', PongScoreView.as_view(), name='PongScore'),

    path('tetris/save_tetris_scores', tetris_save_tetris_scores.as_view(),
         name='save_tetris_scores'),

    path('tetris/next-match', tetris_get_next_match.as_view(), name='tetris_next_match'),
    path('tetris/add-player', tetris_add_player.as_view(), name='tetris_add_player'),
    path('tetris/get-player', tetris_get_player.as_view(), name='tetris_get_player'),
    path('tetris/remove-player', tetris_remove_player.as_view(), name='tetris_remove_player'),
    path('tetris/get_active_players', tetris_get_active_players.as_view(),
         name='tetris_get_active_players'),
    path('get_game_id', get_game_id.as_view(), name='get_game_id'),

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
    path('tournament/get_participants', tournament_get_participants.as_view(),
         name='to_get_participants'),
    path('tournament/get_game', tournament_get_game.as_view(), name='to_get_game'),
    path('tournament/ping', tournament_ping.as_view(), name='tournament_ping'),
]
