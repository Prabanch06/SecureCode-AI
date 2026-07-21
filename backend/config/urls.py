from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/projects/', include('apps.projects.urls')),
    path('api/analysis/', include('apps.analysis.urls')),
    path('api/ai/', include('apps.ai_engine.urls')),
    path('api/security/', include('apps.security.urls')),
    path('api/rag/', include('apps.rag_search.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
]
