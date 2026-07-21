from django.db import models
from apps.projects.models import Project

class AnalysisJob(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='jobs')
    status = models.CharField(max_length=50, default='Pending') # Pending, Running, Succeeded, Failed
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Job {self.id} - {self.project.name} ({self.status})"

class CodeIssue(models.Model):
    job = models.ForeignKey(AnalysisJob, on_delete=models.CASCADE, related_name='issues')
    severity = models.CharField(max_length=20) # High, Medium, Low
    category = models.CharField(max_length=50) # Style, Bug, Warning, Refactoring
    line = models.CharField(max_length=20, default='General')
    file = models.CharField(max_length=255)
    message = models.TextField()
    suggested_fix = models.TextField(blank=True)

    def __str__(self):
        return f"{self.severity} - {self.category} in {self.file}:{self.line}"

class TechnicalDebtReport(models.Model):
    job = models.OneToOneField(AnalysisJob, on_delete=models.CASCADE, related_name='tech_debt')
    maintainability_index = models.FloatField(default=100.0)
    cyclomatic_complexity = models.IntegerField(default=1)
    technical_debt_ratio = models.FloatField(default=0.0)
    code_duplication = models.FloatField(default=0.0)
    architecture_debt = models.TextField(blank=True)

    def __str__(self):
        return f"Debt for Job {self.job.id} - Maintainability: {self.maintainability_index}"
