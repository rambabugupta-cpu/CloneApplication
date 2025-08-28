#!/bin/bash
# Create/update Secret Manager secrets used by Cloud Run

set -euo pipefail

PROJECT_ID=${PROJECT_ID:-"accountancy-469917"}

export PATH="/workspaces/CloneApplication/codespace/google-cloud-sdk/bin:$PATH"

echo "🔐 Ensuring Secret Manager secrets exist in project: $PROJECT_ID"

gcloud config set project "$PROJECT_ID" >/dev/null

create_or_update_secret() {
  local name="$1"; shift
  local value="$1"; shift
  if gcloud secrets describe "$name" >/dev/null 2>&1; then
    echo "➕ Adding new version for secret: $name"
    printf "%s" "$value" | gcloud secrets versions add "$name" --data-file=- >/dev/null
  else
    echo "🆕 Creating secret: $name"
    printf "%s" "$value" | gcloud secrets create "$name" --data-file=- --replication-policy=automatic >/dev/null
  fi
}

# Read values from environment or prompt
: "${DATABASE_URL:?Set DATABASE_URL in env before running}"
: "${GOOGLE_CLIENT_ID:?Set GOOGLE_CLIENT_ID in env before running}"
: "${GOOGLE_CLIENT_SECRET:?Set GOOGLE_CLIENT_SECRET in env before running}"
: "${FRONTEND_ORIGIN:=https://accountancy-469917.web.app}"

create_or_update_secret DATABASE_URL "$DATABASE_URL"
create_or_update_secret GOOGLE_CLIENT_ID "$GOOGLE_CLIENT_ID"
create_or_update_secret GOOGLE_CLIENT_SECRET "$GOOGLE_CLIENT_SECRET"
create_or_update_secret FRONTEND_ORIGIN "$FRONTEND_ORIGIN"

echo "✅ Secrets are ready"
