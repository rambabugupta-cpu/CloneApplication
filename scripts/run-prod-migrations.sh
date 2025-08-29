#!/bin/bash
# Run Drizzle migrations and seed against production DB

set -euo pipefail

export PATH="/workspaces/CloneApplication/codespace/google-cloud-sdk/bin:$PATH"

PROJECT_ID=${PROJECT_ID:-"accountancy-469917"}

echo "🏗️  Running migrations in project: $PROJECT_ID"
gcloud config set project "$PROJECT_ID" >/dev/null

if [ -z "${DATABASE_URL:-}" ]; then
  echo "🔎 Fetching DATABASE_URL from Secret Manager..."
  DATABASE_URL=$(gcloud secrets versions access latest --secret=DATABASE_URL 2>/dev/null || true)
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set and could not be fetched from Secret Manager."
  exit 1
fi

export DATABASE_URL

echo "🔧 Applying schema (drizzle push) and seeding"
npm run db:migrate

echo "✅ Migrations complete"
