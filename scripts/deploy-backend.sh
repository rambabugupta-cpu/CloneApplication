#!/bin/bash
# Script to deploy backend to Google Cloud Run

# Set environment variables
export PATH="/workspaces/CloneApplication/codespace/google-cloud-sdk/bin:$PATH"

# Project configuration
PROJECT_ID=${PROJECT_ID:-"accountancy-469917"}
SERVICE_NAME=${SERVICE_NAME:-"tally-backend"}
REGION=${REGION:-"asia-south2"}

echo "🚀 Deploying backend to Google Cloud Run..."

# Set the project
gcloud config set project $PROJECT_ID

# Optional local build of backend to ensure dist exists (Cloud Run source build also works)
npm run build:backend || true

# Deploy to Cloud Run using Secret Manager for sensitive values
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --set-env-vars=NODE_ENV=production,SERVE_CLIENT=false,PGSSLMODE=disable \
  --set-secrets=DATABASE_URL=DATABASE_URL:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,FRONTEND_ORIGIN=FRONTEND_ORIGIN:latest

echo "✅ Backend deployment complete!"
echo "🌐 Your backend URL will be: https://$SERVICE_NAME-<hash>.$REGION.run.app"
echo "📋 Run 'gcloud run services list' to get the exact URL"
