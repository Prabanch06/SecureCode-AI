from rest_framework import serializers
from .models import AnalysisJob, CodeIssue, TechnicalDebtReport

class CodeIssueSerializer(serializers.ModelSerializer):
    class Meta:
        model = CodeIssue
        fields = ['id', 'severity', 'category', 'line', 'file', 'message', 'suggested_fix']

class TechnicalDebtReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = TechnicalDebtReport
        fields = ['maintainability_index', 'cyclomatic_complexity', 'technical_debt_ratio', 'code_duplication', 'architecture_debt']

class AnalysisJobSerializer(serializers.ModelSerializer):
    issues = CodeIssueSerializer(many=True, read_only=True)
    tech_debt = TechnicalDebtReportSerializer(read_only=True)
    project_name = serializers.ReadOnlyField(source='project.name')

    class Meta:
        model = AnalysisJob
        fields = ['id', 'project', 'project_name', 'status', 'issues', 'tech_debt', 'created_at', 'completed_at']
