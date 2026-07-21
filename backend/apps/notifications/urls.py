from django.urls import path
from . import views

urlpatterns = [
    path('slack/', views.send_slack_notification, name='notify-slack'),
    path('email/', views.send_email_notification, name='notify-email'),
]
