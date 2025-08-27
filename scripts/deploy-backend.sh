#!/bin/bash
# Script to deploy backend to Google Cloud Run

# Set environment variables
export PATH="/workspaces/CloneApplication/codespace/google-cloud-sdk/bin:$PATH"

# Project configuration - replace with your actual project ID
PROJECT_ID="accountancy-469917"
SERVICE_NAME="tally-backend"
REGION="asia-south2"

echo "🚀 Deploying backend to Google Cloud Run..."

# Set the project
gcloud config set project $PROJECT_ID

# Build and deploy to Cloud Run
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=3000 \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --set-env-vars="NODE_ENV=production"

echo "✅ Backend deployment complete!"
echo "🌐 Your backend URL will be: https://$SERVICE_NAME-<hash>.$REGION.run.app"
echo "📋 Run 'gcloud run services list' to get the exact URL"
