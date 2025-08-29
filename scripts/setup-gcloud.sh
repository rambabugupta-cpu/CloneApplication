#!/bin/bash
# Quick authentication and project setup script

export PATH="/workspaces/CloneApplication/codespace/google-cloud-sdk/bin:$PATH"

echo "🔐 Setting up Google Cloud authentication..."

echo "Run this to authenticate (browserless):"
echo "  gcloud auth login --no-launch-browser"
echo "Then set project and region:"
echo "  gcloud config set project accountancy-469917"
echo "  gcloud config set run/region asia-south2"
echo "List Cloud Run services:"
echo "  gcloud run services list"
echo ""
echo "Next: prepare secrets and deploy:"
echo "  ./scripts/bootstrap-secrets.sh"
echo "  ./scripts/deploy-backend.sh"
