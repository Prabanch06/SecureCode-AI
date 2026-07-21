from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import SecurityIssue
from .serializers import SecurityIssueSerializer
from apps.analysis.models import AnalysisJob

class SecurityIssueViewSet(viewsets.ModelViewSet):
    queryset = SecurityIssue.objects.all().order_by('-created_at')
    serializer_class = SecurityIssueSerializer

    def list(self, req, *args, **kwargs):
        # Auto-populate some sample vulnerabilities if none exist in the db
        if SecurityIssue.objects.count() == 0 and AnalysisJob.objects.exists():
            job = AnalysisJob.objects.first()
            
            SecurityIssue.objects.create(
                job=job,
                owasp_category='A03:2021-Injection',
                cve_id='CVE-2026-38291',
                cvss_score=8.8,
                severity='High',
                exploitability_score=2.8,
                remediation_guidance='Use Django ORM or parameterized DB queries. Avoid raw string concatenations.',
                file='backend/apps/projects/views.py',
                line='45',
                description='Potential SQL Injection detected. Unchecked parameters are appended directly to SQL queries.'
            )
            
            SecurityIssue.objects.create(
                job=job,
                owasp_category='A02:2021-Cryptographic Failures',
                cve_id='CVE-2026-90412',
                cvss_score=9.1,
                severity='Critical',
                exploitability_score=3.9,
                remediation_guidance='Store keys securely using environment variables or secret managers (e.g. AWS Secrets Manager).',
                file='backend/config/settings.py',
                line='7',
                description='Hardcoded API secret token key value exposed.'
            )
            
            SecurityIssue.objects.create(
                job=job,
                owasp_category='A01:2021-Broken Access Control',
                cve_id='CVE-2026-1092',
                cvss_score=6.5,
                severity='Medium',
                exploitability_score=2.2,
                remediation_guidance='Verify permissions check on object level prior to deletion actions.',
                file='backend/apps/authentication/views.py',
                line='132',
                description='Lack of object-level authorization check. Any logged-in member can delete other users.'
            )

        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

@api_view(['GET'])
def security_stats_view(req):
    issues = SecurityIssue.objects.all()
    
    # Calculate security score (out of 100)
    # Deduct score for each vulnerability: Critical=15, High=10, Medium=5, Low=2
    score = 100
    risk_distribution = {'Critical': 0, 'High': 0, 'Medium': 0, 'Low': 0}
    owasp_counts = {}
    
    for issue in issues:
        sev = issue.severity
        if sev in risk_distribution:
            risk_distribution[sev] += 1
            
        if sev == 'Critical':
            score -= 15
        elif sev == 'High':
            score -= 10
        elif sev == 'Medium':
            score -= 5
        elif sev == 'Low':
            score -= 2
            
        cat = issue.owasp_category
        owasp_counts[cat] = owasp_counts.get(cat, 0) + 1
        
    score = max(0, score)
    
    return Response({
        'securityScore': score,
        'vulnerabilitiesCount': issues.count(),
        'riskDistribution': risk_distribution,
        'owaspCounts': owasp_counts,
        'complianceStatus': 'Healthy' if score >= 85 else ('Warning' if score >= 60 else 'Non-compliant')
    })
