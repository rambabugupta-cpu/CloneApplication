# GCP Deployment Guide (Backend, Frontend, Database)

This document explains how to update your backend, frontend, and database on Google Cloud Platform (GCP) using the scripts in this repo.

## Prerequisites
- gcloud CLI authenticated to your project
- Firebase CLI authenticated (for Hosting)
- Cloud SQL instance created and reachable
- Required secrets ready: DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, FRONTEND_ORIGIN

## 1) Configure gcloud and authenticate

```bash
# One-time per environment
./scripts/setup-gcloud.sh
# Or manually
gcloud auth login --no-launch-browser
gcloud config set project accountancy-469917
```

## 2) Prepare secrets in Secret Manager

```bash
export PROJECT_ID=accountancy-469917
export DATABASE_URL="postgres://user:pass@HOST:5432/tallyToCash?sslmode=disable"
export GOOGLE_CLIENT_ID="<your-client-id>"
export GOOGLE_CLIENT_SECRET="<your-client-secret>"
export FRONTEND_ORIGIN="https://accountancy-469917.web.app,https://accountancy-469917.firebaseapp.com"

./scripts/bootstrap-secrets.sh
```

## 3) Deploy backend to Cloud Run

```bash
export PROJECT_ID=accountancy-469917
export REGION=asia-south2
./scripts/deploy-backend.sh
```

- The service name defaults to `tally-backend`.
- Secrets are injected at runtime via `--set-secrets`.

## 4) Update database schema (Drizzle)

Make sure `DATABASE_URL` points to your production Cloud SQL. Then run migrations/seeding:

```bash
export DATABASE_URL="postgres://user:pass@HOST:5432/tallyToCash?sslmode=disable"
# Optional for local client
export PGSSLMODE=disable

npm run db:migrate
```

Notes:
- `db-bootstrap.ts` connects, ensures DB exists (if permitted), runs `drizzle-kit push`, and seeds idempotently.
- If your Cloud SQL user lacks create DB permissions, pre-create the database or run migrations using a privileged user.

## 5) Deploy frontend to Firebase Hosting

```bash
# Build and deploy
./scripts/deploy-frontend.sh
```

Ensure `firebase.json` rewrites point your `/api/**` to the Cloud Run URL of the backend service.

## Troubleshooting
- 401/403 CORS/auth: verify FRONTEND_ORIGIN secret contains both Firebase web.app and firebaseapp.com domains.
- Cloud Run failing to start: check Logs Explorer for environment variables and database connectivity.
- DB SSL issues: add `?sslmode=disable` if your instance does not require SSL; otherwise use `require` and configure client certs.
