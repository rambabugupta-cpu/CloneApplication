# OAuth Consent Screen Configuration Guide

## Current Status ✅
- OAuth Brand: ✅ EXISTS (Accountancy)
- OAuth Client: ✅ EXISTS (Tally Cash Web App)
- Privacy Policy: ✅ ACCESSIBLE (https://accountancy-469917.web.app/privacy.html)
- Terms of Service: ✅ ACCESSIBLE (https://accountancy-469917.web.app/terms.html)
- Frontend: ✅ DEPLOYED (https://accountancy-469917.web.app/auth-test)
- Backend: ⚠️ PROTECTED (403 - expected due to IAM policies)

## Step-by-Step Configuration

### 1. Access OAuth Consent Screen
**URL**: https://console.cloud.google.com/apis/credentials/consent?project=accountancy-469917

### 2. Edit OAuth Consent Screen
Click "EDIT APP" button

### 3. App Information Tab
```
App name: Tally Cash Collection Application
User support email: rambabugupta@rbgconstruction.in

App logo: [OPTIONAL - Upload if you have one]

App domain section:
  Application home page: https://accountancy-469917.web.app
  Application privacy policy link: https://accountancy-469917.web.app/privacy.html
  Application terms of service link: https://accountancy-469917.web.app/terms.html

Authorized domains:
  accountancy-469917.web.app
  accountancy-469917.firebaseapp.com

Developer contact information:
  Email addresses: rambabugupta@rbgconstruction.in
```

### 4. Scopes Tab
Click "ADD OR REMOVE SCOPES"
Select these scopes:
- [ ] `openid` - OpenID Connect
- [ ] `email` - See your primary Google Account email address  
- [ ] `profile` - See your personal info, including any personal info you've made publicly available

Click "UPDATE"

### 5. Test Users Tab (Development Only)
Click "ADD USERS"
Add email addresses:
- rambabugupta@rbgconstruction.in
- [Add other test users as needed]

### 6. Summary Tab
Review all information
Publishing status: "TESTING" (recommended for development)
Click "SAVE AND CONTINUE"

## Testing After Configuration

### Test URL: https://accountancy-469917.web.app/auth-test

### Expected Flow:
1. Click "Sign In with Google"
2. Google OAuth popup opens
3. Select your Google account
4. Grant permissions (email, profile)
5. Redirect back to app
6. User info displays
7. "Test API Call" button works

## Troubleshooting

### If you see "This app isn't verified":
- Click "Advanced" 
- Click "Go to Tally Cash Collection Application (unsafe)"
- This is normal for apps in testing mode

### If login fails:
- Check browser console for errors
- Verify you're added as a test user
- Ensure scopes are properly configured

## Production Deployment (Later)

### For unlimited users:
1. Complete app verification process
2. Change publishing status to "PRODUCTION"
3. May require Google review (1-6 weeks)

## Current OAuth Client ID
597099030754-c6i7kp1nn4iq8dcrlhf7j7qogsso9tnv.apps.googleusercontent.com
