from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SecurityIssueViewSet, security_stats_view

router = DefaultRouter()
router.register('vulnerabilities', SecurityIssueViewSet, basename='security-issue')

urlpatterns = [
    path('stats/', security_stats_view, name='security-stats'),
    path('', include(router.urls)),
]
