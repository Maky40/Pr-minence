"""
URL configuration for pong project.

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
from .views import match_exists_view, create_individual_match, accept_individual_match, refuse_individual_match, delete_individual_match, get_individual_match

urlpatterns = [
    path('admin/', admin.site.urls),
    path('match-exists/<int:match_id>/', match_exists_view, name='match-exists'),
    path('match/individual/create/', create_individual_match, name='create-individual-match'),
    path('match/individual/accept/', accept_individual_match, name='accept-individual-match'),
    path('match/individual/refuse/', refuse_individual_match, name='refuse-individual-match'),
	path('match/individual/delete', delete_individual_match, name='delete-individual-match'),
	path('match/individual/', get_individual_match, name='get-individual-match'),
]
