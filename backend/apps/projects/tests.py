from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from .models import Project, Repository

class ProjectModelTest(TestCase):
    def test_project_creation(self):
        project = Project.objects.create(
            name="Test Project",
            description="Testing project creation"
        )
        self.assertEqual(project.name, "Test Project")
        self.assertEqual(str(project), "Test Project")

    def test_repository_creation(self):
        project = Project.objects.create(name="Repo Parent")
        repo = Repository.objects.create(
            project=project,
            name="child-repo",
            git_url="https://github.com/test/child-repo.git",
            branch="develop"
        )
        self.assertEqual(repo.name, "child-repo")
        self.assertEqual(str(repo), "Repo Parent - child-repo")


class ProjectAPITest(APITestCase):
    def setUp(self):
        from django.contrib.auth.models import User
        from rest_framework_simplejwt.tokens import RefreshToken
        self.user = User.objects.create_user(username='testuser', password='password123')
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        self.project = Project.objects.create(
            name="API Test Project",
            description="Testing project APIs"
        )
        self.repo = Repository.objects.create(
            project=self.project,
            name="api-repo",
            git_url="https://github.com/test/api-repo.git"
        )

    def test_list_projects(self):
        # The router registers ProjectViewSet at 'projects'
        # Reverse name structure for nested urls under api/projects/ routing is project-list
        url = reverse('project-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should contain at least self.project (and possibly pre-populated mock ones if count was 0)
        self.assertTrue(len(response.data) >= 1)
        names = [p['name'] for p in response.data]
        self.assertIn("API Test Project", names)

    def test_create_project(self):
        url = reverse('project-list')
        data = {
            "name": "Brand New Project",
            "description": "Created via API tests"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Project.objects.filter(name="Brand New Project").count(), 1)
