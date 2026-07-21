from rest_framework import serializers
from .models import SecurityIssue

class SecurityIssueSerializer(serializers.ModelSerializer):
    class Meta:
        model = SecurityIssue
        fields = '__all__'
