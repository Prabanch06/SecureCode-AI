from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, RepositoryViewSet

router = DefaultRouter()
router.register('projects', ProjectViewSet, basename='project')
router.register('repositories', RepositoryViewSet, basename='repository')

urlpatterns = [
    path('', include(router.urls)),
]
