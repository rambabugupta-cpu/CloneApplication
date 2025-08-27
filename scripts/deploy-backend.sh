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
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --set-env-vars="NODE_ENV=production,DATABASE_URL=postgres://tallyuser:9oPOKUl2FRm3DYMn@35.239.108.141:5432/tallyToCash?sslmode=disable,PGSSLMODE=disable,SERVE_CLIENT=false,GOOGLE_CLIENT_ID=597099030754-c6i7kp1nn4iq8dcrlhf7j7qogsso9tnv.apps.googleusercontent.com"

echo "✅ Backend deployment complete!"
echo "🌐 Your backend URL will be: https://$SERVICE_NAME-<hash>.$REGION.run.app"
echo "📋 Run 'gcloud run services list' to get the exact URL"
