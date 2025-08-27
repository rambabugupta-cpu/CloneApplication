#!/bin/bash
# Quick authentication and project setup script

export PATH="/workspaces/CloneApplication/codespace/google-cloud-sdk/bin:$PATH"

echo "🔐 Setting up Google Cloud authentication..."

# Try to authenticate with the provided code
echo "Please run this command manually and enter your verification code:"
echo "gcloud auth login --no-launch-browser"
echo ""
echo "Your verification code: 4/0AVMBsJgb7smYHeF2oq4Fgcna8hGke4I6AjqZx7CZMDnyoM6HTPbhNv97q7eOBJESuGQcgQ"
echo ""
echo "After authentication, run:"
echo "gcloud config set project accountancy-469917"
echo "gcloud config set run/region asia-south2"
echo "gcloud run services list"
echo ""
echo "Then run the migration and deployment script:"
echo "./scripts/migrate-to-asia-south2.sh"
