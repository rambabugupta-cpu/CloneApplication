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

# Set the Google Cloud project
export GOOGLE_CLOUD_PROJECT="accountancy-469917"
export GCLOUD_PROJECT="accountancy-469917"

# Build the application
echo "📦 Building frontend application..."
npm run build

# Check if firebase.json exists
if [ ! -f "firebase.json" ]; then
    echo "❌ firebase.json not found. Creating basic configuration..."
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
      {
        "source": "/api/**",
        "destination": "https://tally-backend-ka4xatti3a-em.a.run.app/api/**"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/api/**",
        "headers": [
          {
            "key": "Access-Control-Allow-Origin",
            "value": "*"
          },
          {
            "key": "Access-Control-Allow-Methods",
            "value": "GET, POST, PUT, DELETE, OPTIONS"
          },
          {
            "key": "Access-Control-Allow-Headers",
            "value": "Content-Type, Authorization"
          }
        ]
      }
    ]
  }
}
EOF
fi

# Deploy to Firebase
echo "🚀 Deploying to Firebase Hosting..."
firebase deploy --project accountancy-469917

# Get the deployed URL
FIREBASE_URL="https://accountancy-469917.web.app"
echo "✅ Frontend deployed successfully!"
echo "🌐 Frontend URL: $FIREBASE_URL"
echo "🔗 Backend URL: https://tally-backend-ka4xatti3a-em.a.run.app"

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
