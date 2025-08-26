# Team Access Deployment Guide

## 🚀 Quick Deploy Backend to Google Cloud Run

### Prerequisites
```bash
# Install Google Cloud CLI
# https://cloud.google.com/sdk/docs/install

# Login and set project
gcloud auth login
gcloud config set project accountancy-469917
```

### One-Click Deployment
```bash
# Navigate to project directory
cd "C:\Users\ramba\source\repos\Clone for upgrade Application\tally-to-cash"

# Deploy backend to Cloud Run (creates public URL)
gcloud run deploy tally-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --set-env-vars DATABASE_URL="postgres://tallyuser:your-password@35.239.108.141:5432/tallyToCash?sslmode=disable" \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 100

# Get the public URL
gcloud run services describe tally-backend --region us-central1 --format 'value(status.url)'
```

### Result
After deployment, you'll get a public URL like:
```
https://tally-backend-12345-uc.a.run.app
```

## 🔗 Team Access Methods

### Method 1: Cloud Run (Production-Ready)
**Best for: Production, staging, team collaboration**

✅ **Pros:**
- Public URL accessible by all team members
- Auto-scaling for 1000+ users
- Integrated with Cloud SQL
- $20-50/month cost
- Zero server management

**Access:** `https://your-backend-url.run.app`

### Method 2: Compute Engine VM (Traditional Server)
**Best for: Development environments**

```bash
# Create VM instance
gcloud compute instances create tally-backend-vm \
  --zone us-central1-a \
  --machine-type e2-standard-2 \
  --image-family ubuntu-2004-lts \
  --image-project ubuntu-os-cloud \
  --tags http-server,https-server

# SSH and setup
gcloud compute ssh tally-backend-vm --zone us-central1-a
```

### Method 3: Ngrok (Development Only)
**Best for: Quick testing/demos**

```bash
# Install ngrok
npm install -g ngrok

# Run backend locally
npm run dev

# In another terminal, expose to internet
ngrok http 5000
```

**Access:** `https://abc123.ngrok.io` (temporary URL)

## 🛡️ Security Considerations

### Environment Variables
```bash
# Set secure environment variables in Cloud Run
gcloud run services update tally-backend \
  --region us-central1 \
  --set-env-vars DATABASE_URL="postgres://tallyuser:password@35.239.108.141:5432/tallyToCash?sslmode=disable" \
  --set-env-vars SESSION_SECRET="your-session-secret" \
  --set-env-vars JWT_SECRET="your-jwt-secret"
```

### Team Access Control
```bash
# Add team members to the project
gcloud projects add-iam-policy-binding accountancy-469917 \
  --member="user:teammate@company.com" \
  --role="roles/run.developer"
```

## 📱 Frontend Configuration

Update frontend to use the new backend URL:

**In `frontend/src/lib/queryClient.ts` or config file:**
```typescript
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://tally-backend-12345-uc.a.run.app'
  : 'http://localhost:5000';
```

## 🔄 CI/CD Pipeline

The `cloudbuild.yaml` is configured for automatic deployment:

1. **Push to GitHub** → Triggers Cloud Build
2. **Build & Test** → Creates Docker image  
3. **Deploy** → Updates Cloud Run service
4. **Notify Team** → Slack/email notifications

## 💰 Cost Estimate (1000+ Users)

| Service | Monthly Cost |
|---------|-------------|
| Cloud Run Backend | $20-50 |
| Cloud SQL Database | $30-80 |
| **Total** | **$50-130** |

## 🎯 Recommended Approach

For your team and 1000+ user scale:

1. **Deploy backend to Cloud Run** (public access)
2. **Keep frontend local** during development
3. **Deploy frontend to Firebase/Vercel** when ready
4. **Use Cloud Build** for automated deployments

This gives you:
- ✅ Team access to backend APIs
- ✅ Production-ready infrastructure  
- ✅ Scalability for 1000+ users
- ✅ Cost-effective solution
