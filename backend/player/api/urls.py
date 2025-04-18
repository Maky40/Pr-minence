"""
URL configuration for player project.

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
from django.urls import path
from api import views
from django.conf import settings
from django.conf.urls.static import static
urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.PlayerInfo.as_view(), name='playerInfoView'),
    path('avatar/', views.PlayerAvatarUpload.as_view(), name='playerAvatarUploadView'),
    path('friendship/', views.PlayerFriendship.as_view(), name='playerFriendshipView'),
    path('2FAChange/', views.TwoFactorActivation.as_view(), name='TwoFactorChangeView'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    path('search-players/', views.PlayerSearch.as_view(), name='playerSearchView'),
    path('matches/', views.get_player_matches, name='get-player-matches'),
    path('tournaments/', views.get_player_tournaments, name='get-player-tournaments'),
    path('match-history/', views.MatchHistoryView.as_view(), name='MatchHistoryView'),
]
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
