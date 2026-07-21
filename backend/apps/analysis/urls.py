from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnalysisJobViewSet

router = DefaultRouter()
router.register('jobs', AnalysisJobViewSet, basename='analysis-job')

urlpatterns = [
    path('', include(router.urls)),
]
