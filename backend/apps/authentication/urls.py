from django.urls import path
from . import views

urlpatterns = [
    path('profile/', views.profile_view, name='profile'),
    path('team/', views.team_list_view, name='team-list'),
    path('team/<int:member_id>/', views.team_detail_view, name='team-detail'),
]
