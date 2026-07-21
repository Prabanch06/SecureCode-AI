from django.db import models

class SecurityIssue(models.Model):
    job = models.ForeignKey('analysis.AnalysisJob', on_delete=models.CASCADE, related_name='security_issues')
    owasp_category = models.CharField(max_length=100) # e.g. Injection, Broken Authentication
    cve_id = models.CharField(max_length=50, blank=True, default='N/A')
    cvss_score = models.FloatField(default=0.0)
    severity = models.CharField(max_length=20) # Critical, High, Medium, Low
    exploitability_score = models.FloatField(default=0.0)
    remediation_guidance = models.TextField()
    file = models.CharField(max_length=255)
    line = models.CharField(max_length=20, default='General')
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.severity} Security Alert - {self.owasp_category} in {self.file}:{self.line}"
