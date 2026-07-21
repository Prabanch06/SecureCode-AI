from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .service import GeminiService
from apps.analysis.models import CodeIssue
from .models import AIFixSuggestion

@api_view(['POST'])
def ai_review_view(req):
    code = req.data.get('code', '')
    language = req.data.get('language', 'Python')
    if not code:
        return Response({'error': 'Code is required'}, status=status.HTTP_400_BAD_REQUEST)
        
    ai = GeminiService()
    review = ai.generate_review(code, language)
    return Response(review)

@api_view(['POST'])
def ai_fix_view(req):
    issue_id = req.data.get('issue_id')
    code = req.data.get('code', '')
    
    if not issue_id:
        return Response({'error': 'issue_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        issue = CodeIssue.objects.get(id=issue_id)
    except CodeIssue.DoesNotExist:
        return Response({'error': 'Issue not found'}, status=status.HTTP_404_NOT_FOUND)
        
    if not code:
        # Fall back to using code stored in the job's context
        # Or look at code issue descriptions
        code = issue.job.project.repositories.first().name if issue.job.project.repositories.exists() else ''
        
    ai = GeminiService()
    fix_data = ai.generate_auto_fix(code, issue.message, issue.job.project.repositories.first().branch if issue.job.project.repositories.exists() else 'Python')
    
    # Save to DB
    suggestion = AIFixSuggestion.objects.create(
        issue=issue,
        original_code=code,
        fixed_code=fix_data.get('fixedCode', ''),
        explanation=fix_data.get('explanation', ''),
        confidence_score=fix_data.get('confidenceScore', 0.8)
    )
    
    return Response({
        'id': suggestion.id,
        'originalCode': suggestion.original_code,
        'fixedCode': suggestion.fixed_code,
        'explanation': suggestion.explanation,
        'confidenceScore': suggestion.confidence_score
    })

@api_view(['POST'])
def ai_chat_view(req):
    code = req.data.get('code', '')
    messages = req.data.get('messages', [])
    language = req.data.get('language', 'Python')
    
    if not messages:
        return Response({'error': 'Messages are required'}, status=status.HTTP_400_BAD_REQUEST)
        
    last_msg = messages[-1].get('content', '')
    history = messages[:-1]
    
    ai = GeminiService()
    reply = ai.chat_explain(code, history, last_msg, language)
    return Response({'reply': reply})
