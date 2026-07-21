from django.urls import path
from . import views

urlpatterns = [
    path('index/', views.index_code_view, name='rag-index'),
    path('search/', views.search_code_view, name='rag-search'),
]
