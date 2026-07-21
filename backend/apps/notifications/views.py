from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import requests

@api_view(['POST'])
def send_slack_notification(req):
    webhook_url = req.data.get('webhook_url', '')
    message = req.data.get('message', 'BugHunter AI Alert: High Severity Issue Detected.')
    
    if not webhook_url:
        # Simulate local dispatch
        return Response({
            'success': True,
            'message': 'Slack notification simulated successfully (Webhook URL not set).'
        })
        
    try:
        payload = {"text": message}
        # Post to Slack webhook
        res = requests.post(webhook_url, json=payload, timeout=5)
        if res.status_code == 200:
            return Response({'success': True, 'message': 'Slack notification sent.'})
        return Response({'error': f'Slack responded with status {res.status_code}'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def send_email_notification(req):
    recipient = req.data.get('email', '')
    subject = req.data.get('subject', 'BugHunter AI Report Ready')
    body = req.data.get('body', 'Your repository intelligence report is compiled.')
    
    if not recipient:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)
        
    # Simulate SMTP dispatch
    return Response({
        'success': True,
        'message': f"Simulated sending email to {recipient} with subject: '{subject}'."
    })
