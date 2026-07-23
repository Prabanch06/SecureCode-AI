from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from . import views
from apps.authentication import views as auth_views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('profile/', views.UserProfileView.as_view(), name='profile'),
    path('forgot-password/', views.ForgotPasswordView.as_view(), name='forgot_password'),
    path('reset-password/', views.ResetPasswordView.as_view(), name='reset_password'),
    path('oauth/config/', views.GitHubOAuthConfigView.as_view(), name='oauth_config'),
    path('oauth/github/', views.GitHubOAuthView.as_view(), name='oauth_github'),
    path('oauth/session-jwt/', views.SessionJWTView.as_view(), name='oauth_session_jwt'),
    path('accounts/', include('allauth.urls')),
    
    # Delegated team endpoints from original authentication app
    path('team/', auth_views.team_list_view, name='team-list'),
    path('team/<int:member_id>/', auth_views.team_detail_view, name='team-detail'),
]
