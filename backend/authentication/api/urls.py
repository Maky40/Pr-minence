"""
URL configuration for authentication project.

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
from . import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
	path('intra/', views.intra_auth, name='intraView'),
    path('intra/callback/', views.intra_callback_auth, name='intracallbackView'),
	path('logout/', views.logout_user, name='logoutView'),
	path('signup/', views.SignupView.as_view(), name='signupView'),
    path('login/', views.LoginView.as_view(), name='loginView'),
	path('verify-2fa/', views.Verify2FAView.as_view(), name='verify2faView')
]
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
