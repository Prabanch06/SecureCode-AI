# API Specifications Document
## AI-Powered Secure Code Intelligence Platform

---

### 1. Authentication Endpoints

#### 1.1. User Profile Setup
- **Endpoint**: `/api/profile/`
- **Method**: `GET`
- **Response**:
```json
{
  "username": "admin",
  "email": "admin@bughunter.ai",
  "mfa_enabled": true,
  "alert_on_critical": true,
  "alert_on_high": false,
  "weekly_digest": true,
  "slack_webhook": "https://hooks.slack.com/services/..."
}
```

#### 1.2. Update Profile & Settings
- **Endpoint**: `/api/profile/`
- **Method**: `POST`
- **Payload**:
```json
{
  "mfa_enabled": true,
  "alert_on_critical": true,
  "alert_on_high": true,
  "weekly_digest": false,
  "slack_webhook": "https://hooks.slack.com/services/..."
}
```
- **Response**:
```json
{
  "success": true
}
```

---

### 2. Project & Repository Management

#### 2.1. List Projects
- **Endpoint**: `/api/projects/`
- **Method**: `GET`
- **Response**:
```json
[
  {
    "id": 1,
    "name": "Secure Web App",
    "description": "Enterprise portal service",
    "repositories": [
      {
        "id": 1,
        "name": "portal-frontend",
        "git_url": "https://github.com/org/portal-frontend.git",
        "branch": "main"
      }
    ],
    "created_at": "2026-06-18T10:00:00Z"
  }
]
```

#### 2.2. Create Project
- **Endpoint**: `/api/projects/`
- **Method**: `POST`
- **Payload**:
```json
{
  "name": "New microservice",
  "description": "Utility scanner api"
}
```
- **Response**:
```json
{
  "id": 2,
  "name": "New microservice",
  "description": "Utility scanner api",
  "repositories": [],
  "created_at": "2026-06-19T00:50:00Z"
}
```

---

### 3. Scanning & Code Analysis

#### 3.1. Submit Code for Analysis
- **Endpoint**: `/api/analyze/`
- **Method**: `POST`
- **Payload**:
```json
{
  "projectName": "Scan - Python Utility",
  "language": "python",
  "code": "import os\ndef test_eval(user_input):\n    eval(user_input)",
  "analysisTypes": ["security", "quality", "complexity"]
}
```
- **Response**:
```json
{
  "id": "scan_uuid_10293",
  "scores": {
    "readability": 85,
    "maintainability": 75,
    "security": 10,
    "performance": 90,
    "overall": 65
  },
  "bugs": [
    {
      "severity": "High",
      "line": 3,
      "issue": "Use of unsafe eval function",
      "suggestedFix": "Use safe mathematical parsers or dictionary lookup instead of direct evaluation"
    }
  ],
  "vulnerabilities": [
    {
      "riskLevel": "Critical",
      "name": "Remote Code Execution (RCE)",
      "impact": "Arbitrary code execution on host OS",
      "recommendation": "Never execute arbitrary user strings directly in interpreter"
    }
  ],
  "optimizations": [
    {
      "type": "Architecture",
      "suggestion": "Extract parsing logic to helper modules"
    }
  ],
  "reviewSummary": "The code contains highly severe remote code execution vulnerabilities due to direct eval use."
}
```

#### 3.2. Fetch Scan History
- **Endpoint**: `/api/history/`
- **Method**: `GET`
- **Response**:
```json
[
  {
    "id": "scan_uuid_10293",
    "project": "Scan - Python Utility",
    "language": "python",
    "bugs": 1,
    "vulnerabilities": 1,
    "score": 65,
    "date": "2026-06-19T00:50:15Z"
  }
]
```

---

### 4. Interactive AI Chat & Vector RAG

#### 4.1. Converse with AI Assistant
- **Endpoint**: `/api/chat/`
- **Method**: `POST`
- **Payload**:
```json
{
  "code": "import os\ndef test_eval(user_input):\n    eval(user_input)",
  "analysis": {
    "scores": {"overall": 65},
    "bugs": [{"issue": "Use of unsafe eval function"}]
  },
  "messages": [
    {
      "role": "user",
      "content": "Why is eval dangerous here?"
    }
  ]
}
```
- **Response**:
```json
{
  "reply": "`eval()` interprets strings as Python expressions. If a user supplies inputs containing `__import__('os').system('rm -rf /')`, they can delete data or take over the container environment."
}
```

#### 4.2. RAG Semantic Search
- **Endpoint**: `/api/rag_search/search/`
- **Method**: `POST`
- **Payload**:
```json
{
  "project_id": 1,
  "query": "find all authentication or token checks",
  "limit": 3
}
```
- **Response**:
```json
[
  {
    "file_path": "backend/apps/authentication/views.py",
    "similarity": 0.89,
    "content": "class ProfileView(APIView):\n    permission_classes = [IsAuthenticated]"
  }
]
```

---

### 5. Team Management & Resource Monitoring

#### 5.1. List Team Members
- **Endpoint**: `/api/team/`
- **Method**: `GET`
- **Response**:
```json
[
  {
    "id": "team_member_uuid",
    "name": "Sarah Connor",
    "email": "sconnor@bughunter.ai",
    "role": "Security Engineer",
    "joined_at": "2026-05-10T09:00:00Z"
  }
]
```

#### 5.2. Fetch API token and Cost Metrics
- **Endpoint**: `/api/usage/`
- **Method**: `GET`
- **Response**:
```json
{
  "totalTokens": 140500,
  "inputTokens": 100200,
  "outputTokens": 40300,
  "totalRequests": 45,
  "totalCost": 0.85,
  "usageOverTime": [
    {
      "name": "Mon",
      "inputTokens": 20000,
      "outputTokens": 8000,
      "cost": 0.12
    }
  ]
}
```
