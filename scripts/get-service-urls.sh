#!/bin/bash
# Script to get your actual Cloud Run service URL and update environment files

export PATH="/workspaces/CloneApplication/codespace/google-cloud-sdk/bin:$PATH"

echo "🔍 Getting your Cloud Run service URLs..."

# List all Cloud Run services
gcloud run services list --platform=managed

echo ""
echo "📋 To get the specific URL for your backend service:"
echo "gcloud run services describe tally-backend --region=asia-south2 --format='value(status.url)'"

echo ""
echo "💡 Copy the URL and update your .env files with the correct backend URL"
