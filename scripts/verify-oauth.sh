#!/bin/bash
# OAuth Configuration Verification Script

echo "🔍 OAuth Configuration Verification"
echo "=================================="

PROJECT_ID="accountancy-469917"
CLIENT_ID="597099030754-c6i7kp1nn4iq8dcrlhf7j7qogsso9tnv.apps.googleusercontent.com"

echo ""
echo "📋 Checking OAuth Configuration..."

# Check if OAuth consent screen is configured
echo "1. Checking OAuth consent screen..."
gcloud alpha iap oauth-brands list --project=$PROJECT_ID --format="table(name,applicationTitle,supportEmail)" 2>/dev/null

echo ""
echo "2. Checking OAuth client configuration..."
gcloud alpha iap oauth-clients list projects/597099030754/brands/597099030754 --project=$PROJECT_ID --format="table(name,displayName)" 2>/dev/null

echo ""
echo "3. Testing required URLs..."
echo "   Privacy Policy:"
curl -s -o /dev/null -w "   Status: %{http_code}" https://accountancy-469917.web.app/privacy.html
echo ""
echo "   Terms of Service:"
curl -s -o /dev/null -w "   Status: %{http_code}" https://accountancy-469917.web.app/terms.html
echo ""

echo ""
echo "4. Testing frontend auth page..."
curl -s -o /dev/null -w "   Auth Test Page Status: %{http_code}" https://accountancy-469917.web.app/auth-test
echo ""

echo ""
echo "5. Testing backend OAuth endpoint..."
curl -s -o /dev/null -w "   Backend OAuth Endpoint Status: %{http_code}" https://tally-backend-597099030754.asia-south2.run.app/api/auth/google
echo ""

echo ""
echo "✅ Verification Complete!"
echo ""
echo "📝 Next Steps:"
echo "   1. Complete OAuth consent screen in Google Cloud Console"
echo "   2. Test Google Sign-In at: https://accountancy-469917.web.app/auth-test"
echo "   3. Run this script again to verify configuration"
