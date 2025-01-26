"""
URL configuration for transcendence project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from django.conf import settings  # Import settings
from django.conf.urls.static import static  # Import static§
from django.views.generic.base import TemplateView
from api.views import LoginCallbackView
from api.views import LoginView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('accounts.urls')), # more info: https://docs.djangoproject.com/en/5.0/topics/auth/default/#module-django.contrib.auth.views
    path('accounts/', include('django.contrib.auth.urls')), # more info: https://docs.djangoproject.com/en/5.0/topics/auth/default/#module-django.contrib.auth.views
    path('', TemplateView.as_view(template_name='home.html'), name='home'),
    path('pong/', include('pong.urls'), name='pong'),
    path('tetris/', include('tetris.urls'), name='tetris'),
    path('api/', include('api.urls')),
    path('login', LoginView, name='login'),
    path('login_callback', LoginCallbackView, name='login_callback'),
]
