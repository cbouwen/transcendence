from django.urls import path
from . import views

app_name = 'tetris'

# views.py
from django.http import HttpResponse

from django.urls import path
from . import views

app_name = 'tetris'

urlpatterns = [
    path('1_player/', views.one_player, name='1_player_test'),  # Changed to test version
    path('2_player/', views.two_player, name='2_player_test'),  # Changed to test version
    path('3_player/', views.three_player, name='3_player_test'),  # Changed to test version
    # If keeping original versions, add additional paths
    path('1_player_original/', views.one_player_original, name='1_player_original'),
    path('2_player_original/', views.two_player_original, name='2_player_original'),
    path('3_player_original/', views.three_player_original, name='3_player_original'),
]
