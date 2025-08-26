#!/usr/bin/env pwsh
# Quick deployment script for team access

Write-Host "🚀 Deploying Backend for Team Access..." -ForegroundColor Green
Write-Host ""

# Check if gcloud is installed
if (!(Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Google Cloud CLI not installed!" -ForegroundColor Red
    Write-Host "Please install from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

# Set project
Write-Host "Setting up Google Cloud project..." -ForegroundColor Blue
gcloud config set project accountancy-469917

# Deploy to Cloud Run
Write-Host "Deploying backend to Cloud Run..." -ForegroundColor Blue
gcloud run deploy tally-backend `
  --source . `
  --region us-central1 `
  --allow-unauthenticated `
  --set-env-vars NODE_ENV=production `
  --set-env-vars DATABASE_URL="postgres://tallyuser:Gupta@123@35.239.108.141:5432/tallyToCash?sslmode=disable" `
  --memory 1Gi `
  --cpu 1 `
  --max-instances 100 `
  --min-instances 1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Getting public URL..." -ForegroundColor Blue
    $url = gcloud run services describe tally-backend --region us-central1 --format 'value(status.url)'
    Write-Host ""
    Write-Host "🌐 Backend URL: $url" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Share this URL with your team members:" -ForegroundColor Yellow
    Write-Host "   API Base: $url" -ForegroundColor White
    Write-Host "   Health Check: $url/api/health" -ForegroundColor White
    Write-Host "   Documentation: $url/api/docs" -ForegroundColor White
    Write-Host ""
    Write-Host "🔧 Update your frontend configuration:" -ForegroundColor Yellow
    Write-Host "   Replace 'http://localhost:5000' with '$url'" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Check the error messages above." -ForegroundColor Yellow
}
