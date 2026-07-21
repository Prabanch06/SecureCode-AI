from rest_framework import serializers
from .models import Project, Repository

class RepositorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Repository
        fields = ['id', 'name', 'git_url', 'branch', 'created_at']

class ProjectSerializer(serializers.ModelSerializer):
    repositories = RepositorySerializer(many=True, read_only=True)
    
    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'repositories', 'created_at']
