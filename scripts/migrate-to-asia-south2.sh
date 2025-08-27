#!/bin/bash
# Script to migrate existing services to asia-south2 region

export PATH="/workspaces/CloneApplication/codespace/google-cloud-sdk/bin:$PATH"

echo "🌏 Migrating services to asia-south2 region..."

# Set project and default region
gcloud config set project accountancy-469917
gcloud config set run/region asia-south2

echo "📋 Listing existing Cloud Run services..."
gcloud run services list --platform=managed

echo ""
echo "🔄 To migrate an existing service to asia-south2:"
echo "1. Deploy the service to the new region:"
echo "   gcloud run deploy SERVICE_NAME --source . --region=asia-south2 --allow-unauthenticated"
echo ""
echo "2. Update traffic to the new region service"
echo "3. Delete the old region service:"
echo "   gcloud run services delete SERVICE_NAME --region=OLD_REGION"

echo ""
echo "🚀 Deploying backend to asia-south2..."
./scripts/deploy-backend.sh
