#!/bin/bash
# Complete setup and deployment script for asia-south2 region

export PATH="/workspaces/CloneApplication/codespace/google-cloud-sdk/bin:$PATH"

echo "🌏 Setting up Google Cloud for asia-south2 region..."

# Check if already authenticated
if gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo "✅ Already authenticated"
else
    echo "🔐 Please authenticate first:"
    echo "Run: gcloud auth login --no-launch-browser"
    echo "Enter your verification code: 4/0AVMBsJgb7smYHeF2oq4Fgcna8hGke4I6AjqZx7CZMDnyoM6HTPbhNv97q7eOBJESuGQcgQ"
    exit 1
fi

# Set project and region
echo "🔧 Configuring project and region..."
gcloud config set project accountancy-469917
gcloud config set run/region asia-south2

# Enable required APIs
echo "🔌 Enabling required APIs..."
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# List existing services
echo "📋 Current Cloud Run services:"
gcloud run services list --platform=managed

# Deploy backend to asia-south2
echo "🚀 Deploying backend to asia-south2..."
cd /workspaces/CloneApplication/_SAFE_TO_KEEP

gcloud run deploy tally-backend \
  --source . \
  --region=asia-south2 \
  --platform=managed \
  --allow-unauthenticated \
  --port=3000 \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --set-env-vars="NODE_ENV=production,DATABASE_URL=postgres://tallyuser:9oPOKUl2FRm3DYMn@35.239.108.141:5432/tallyToCash?sslmode=disable"

# Get the new service URL
echo "🌐 Getting service URL..."
SERVICE_URL=$(gcloud run services describe tally-backend --region=asia-south2 --format='value(status.url)')
echo "✅ Backend deployed at: $SERVICE_URL"

# Update environment files
echo "📝 Updating environment files..."
cd /workspaces/CloneApplication
sed -i "s|API_URL=.*|API_URL=$SERVICE_URL/|g" _SAFE_TO_KEEP/.env
sed -i "s|VITE_API_URL=.*|VITE_API_URL=$SERVICE_URL/|g" _SAFE_TO_KEEP/frontend/.env

echo "🎉 Deployment complete!"
echo "Backend URL: $SERVICE_URL"
