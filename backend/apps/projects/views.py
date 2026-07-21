from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import Project, Repository
from .serializers import ProjectSerializer, RepositorySerializer

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all().order_by('-created_at')
    serializer_class = ProjectSerializer
    
    def get_serializer_class(self):
        return ProjectSerializer

    def list(self, req, *args, **kwargs):
        # Pre-populate sample repositories if database is empty
        if Project.objects.count() == 0:
            p1 = Project.objects.create(name='AuthService', description='Microservice handling user registration, login, and authorization tokens.')
            Repository.objects.create(project=p1, name='auth-service-repo', git_url='https://github.com/company/auth-service', branch='main')
            
            p2 = Project.objects.create(name='UserDashboard', description='React-based client application displaying personal user dashboard widgets.')
            Repository.objects.create(project=p2, name='user-dashboard-repo', git_url='https://github.com/company/user-dashboard', branch='develop')
            
            p3 = Project.objects.create(name='PaymentGateway', description='Stripe and PayPal integration middleware handler.')
            Repository.objects.create(project=p3, name='payment-gateway-repo', git_url='https://github.com/company/payment-gateway', branch='master')
            
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class RepositoryViewSet(viewsets.ModelViewSet):
    queryset = Repository.objects.all()
    serializer_class = RepositorySerializer
