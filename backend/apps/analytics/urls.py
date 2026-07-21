from django.urls import path
from . import views

urlpatterns = [
    path('overview/', views.analytics_overview_view, name='analytics-overview'),
]
