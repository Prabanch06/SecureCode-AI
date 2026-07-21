# Deployment Guide
## AI-Powered Secure Code Intelligence Platform

This manual details how to deploy the platform locally using Docker Compose, or to a Kubernetes cluster in a production environment.

---

### 1. Prerequisites
Before initiating the deployment, ensure the following are installed:
- **Docker** Engine 24+ and **Docker Compose** v2+
- **kubectl** (if deploying to Kubernetes)
- A registered **Google Gemini API Key** (to use code review, explanation, and vector generation capabilities)

---

### 2. Environment Variables Configuration
Create a `.env` configuration file in the root directory:
```env
# System Debug Mode
DEBUG=False

# Django Secret Encryption Key
DJANGO_SECRET_KEY=django-insecure-k%18_9u%13*19+g5&3b_#04d_ef10-intel-platform-key

# Relational Database Config
POSTGRES_DB=bughunter_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres_secure_password_2026
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Redis Broker Configuration
REDIS_URL=redis://redis:6379/0

# Generative AI Key
GEMINI_API_KEY=AIzaSy...your_actual_key...
```

---

### 3. Local Deployment (Docker Compose)

The fastest way to deploy the platform is via Docker Compose:

#### 3.1. Build and Launch Services
In the root directory, execute:
```bash
docker compose -f devops/docker-compose.yml up --build -d
```
This command builds the Django, Nginx, and Celery images and spins up PostgreSQL and Redis.

#### 3.2. Check Service Health
Verify that all containers are online:
```bash
docker compose -f devops/docker-compose.yml ps
```
Or check application logs:
```bash
docker compose -f devops/docker-compose.yml logs -f backend
```

#### 3.3. Verify Execution
Open your web browser and navigate to:
- **Frontend Panel**: `http://localhost:3000`
- **Django Admin Gateway**: `http://localhost:8000/admin/`

---

### 4. Production Deployment (Kubernetes)

To deploy to Kubernetes:

#### 4.1. Apply Configuration Resources
```bash
kubectl apply -f devops/k8s/deployment.yaml
```

#### 4.2. Verify Pod Creation
```bash
kubectl get pods -n bughunter
```
Expected output shows running instances for `db`, `redis`, `backend`, `celery-worker`, and `frontend`.

#### 4.3. Exposing the Platform
By default, the `frontend-service` configuration is set to type `LoadBalancer` which will fetch an external IP from your cloud provider (GKE, EKS, AKS).
Run this to fetch the external URL:
```bash
kubectl get service frontend-service -n bughunter -w
```

---

### 5. Troubleshooting & Diagnostics

#### 5.1. Database Migrations
If database schema updates do not apply automatically:
```bash
docker exec -it bughunter_backend python manage.py migrate
```

#### 5.2. Celery Queue Diagnostics
If static scan results are stuck in a `PENDING` state, check the worker tasks logs:
```bash
docker logs bughunter_celery_worker
```

#### 5.3. Checking Static Files Mapping
If CSS styling or images fail to render on Django admin pages, run collectstatic:
```bash
docker exec -it bughunter_backend python manage.py collectstatic --noinput
```
