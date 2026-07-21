from django.urls import path
from . import views

urlpatterns = [
    path('review/', views.ai_review_view, name='ai-review'),
    path('fix/', views.ai_fix_view, name='ai-fix'),
    path('chat/', views.ai_chat_view, name='ai-chat'),
]
