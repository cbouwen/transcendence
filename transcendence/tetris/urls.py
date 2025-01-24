from django.urls import path
from . import views

app_name = 'tetris'

urlpatterns = [
    path('', views.tetris_main, name='main'),

    path('1_player/', views.one_player, name='1_player_test'),
    path('2_player/', views.two_player, name='2_player_test'),
    path('3_player/', views.three_player, name='3_player_test'),

    path('1_player_original/', views.one_player_original, name='1_player_original'),
    path('2_player_original/', views.two_player_original, name='2_player_original'),
    path('3_player_original/', views.three_player_original, name='3_player_original'),

    path('api/save-tetris-scores/', views.save_tetris_scores, name='save_tetris_scores'),
]
