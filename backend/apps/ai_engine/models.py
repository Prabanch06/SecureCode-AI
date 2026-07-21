from django.db import models

class AIFixSuggestion(models.Model):
    # String relationship to avoid circular imports
    issue = models.ForeignKey('analysis.CodeIssue', on_delete=models.CASCADE, related_name='ai_fixes')
    original_code = models.TextField()
    fixed_code = models.TextField()
    explanation = models.TextField()
    confidence_score = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"AI Fix Suggestion for Issue {self.issue.id} ({self.confidence_score * 100}%)"
