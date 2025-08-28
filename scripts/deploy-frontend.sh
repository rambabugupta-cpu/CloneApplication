#!/bin/bash

# Deploy Frontend to Firebase Hosting
# This script builds and deploys the frontend application

set -e

echo "🚀 Starting frontend deployment process..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Set the Google Cloud project and region
PROJECT_ID=${PROJECT_ID:-"accountancy-469917"}
REGION=${REGION:-"asia-south2"}
SERVICE_NAME=${SERVICE_NAME:-"tally-backend"}
export GOOGLE_CLOUD_PROJECT="$PROJECT_ID"
export GCLOUD_PROJECT="$PROJECT_ID"

# Build the application
echo "📦 Building frontend application..."
npm run build

# Determine backend URL from Cloud Run if available
BACKEND_URL=${BACKEND_URL:-""}
if command -v gcloud &> /dev/null; then
  echo "🔍 Looking up Cloud Run service URL for $SERVICE_NAME in $REGION..."
  LOOKUP_URL=$(gcloud run services describe "$SERVICE_NAME" --region="$REGION" --format='value(status.url)' 2>/dev/null || true)
  if [ -n "$LOOKUP_URL" ]; then
    BACKEND_URL="$LOOKUP_URL"
  fi
fi

# If we have a backend URL, ensure firebase.json has an /api rewrite to it
if [ -n "$BACKEND_URL" ]; then
  echo "📝 Writing firebase.json with API rewrite to: $BACKEND_URL"
  cat > firebase.json << EOF
{
  "hosting": {
    "public": "dist/frontend",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      { "source": "/api/**", "destination": "${BACKEND_URL}/api/**" },
      { "source": "**", "destination": "/index.html" }
    ],
    "headers": [
      {
        "source": "/api/**",
        "headers": [
          { "key": "Access-Control-Allow-Methods", "value": "GET, POST, PUT, DELETE, OPTIONS" },
          { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization" }
        ]
      }
    ]
  }
}
EOF
else
  echo "⚠️ Could not determine BACKEND_URL automatically. Using existing firebase.json. Set BACKEND_URL env var to override."
fi

# Deploy to Firebase
echo "🚀 Deploying to Firebase Hosting..."
firebase deploy --project "$PROJECT_ID"

# Get the deployed URL
FIREBASE_URL="https://${PROJECT_ID}.web.app"
echo "✅ Frontend deployed successfully!"
echo "🌐 Frontend URL: $FIREBASE_URL"
echo "🔗 Backend URL: ${BACKEND_URL:-"(unknown)"}"

# Test the deployment
echo "🧪 Testing deployment..."
if curl -s -o /dev/null -w "%{http_code}" "$FIREBASE_URL" | grep -q "200"; then
    echo "✅ Frontend is accessible!"
else
    echo "⚠️  Frontend might not be fully ready yet. Please check manually."
fi

echo "📝 Deployment Summary:"
echo "  - Frontend: $FIREBASE_URL"
echo "  - Backend:  https://tally-backend-ka4xatti3a-em.a.run.app"
echo "  - Status:   Ready for testing"
echo ""
echo "🔧 Next Steps:"
echo "  1. Open the frontend URL to test the application"
echo "  2. Check authentication functionality"
echo "  3. Verify backend connectivity"
