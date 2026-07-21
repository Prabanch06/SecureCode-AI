from rest_framework import serializers
from .models import AIFixSuggestion

class AIFixSuggestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIFixSuggestion
        fields = ['id', 'issue', 'original_code', 'fixed_code', 'explanation', 'confidence_score', 'created_at']
