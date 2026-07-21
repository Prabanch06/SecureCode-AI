from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from apps.projects.models import Project
from .models import AnalysisJob, CodeIssue, TechnicalDebtReport
from .serializers import AnalysisJobSerializer
from .engine import StaticAnalysisEngine

class AnalysisJobViewSet(viewsets.ModelViewSet):
    queryset = AnalysisJob.objects.all().order_by('-created_at')
    serializer_class = AnalysisJobSerializer

    def create(self, req, *args, **kwargs):
        project_id = req.data.get('project')
        code = req.data.get('code', '')
        language = req.data.get('language', 'Python')
        file_name = req.data.get('file_name', 'main.py')
        
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)

        # Create Analysis Job record
        job = AnalysisJob.objects.create(
            project=project,
            status='Running'
        )

        try:
            # Execute scanner
            engine = StaticAnalysisEngine(code=code, language=language, file_name=file_name)
            issues, metrics = engine.run_all()
            
            # Save issues
            for issue in issues:
                CodeIssue.objects.create(
                    job=job,
                    severity=issue['severity'],
                    category=issue['category'],
                    line=str(issue['line']),
                    file=issue['file'],
                    message=issue['message'],
                    suggested_fix=issue.get('suggested_fix', '')
                )
                
            # Save Technical Debt Report
            TechnicalDebtReport.objects.create(
                job=job,
                maintainability_index=metrics['maintainability_index'],
                cyclomatic_complexity=metrics['cyclomatic_complexity'],
                technical_debt_ratio=metrics['technical_debt_ratio'],
                code_duplication=metrics['code_duplication'],
                architecture_debt=metrics['architecture_debt']
            )
            
            job.status = 'Succeeded'
            job.completed_at = timezone.now()
            job.save()
            
        except Exception as e:
            job.status = 'Failed'
            job.completed_at = timezone.now()
            job.save()
            print(f"Failed analysis job execution: {e}")
            return Response({'error': f'Analysis failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        serializer = self.get_serializer(job)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
