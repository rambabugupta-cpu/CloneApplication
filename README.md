# tally-to-cash
## Cloud-Based Development Workflow

This project is set up for fast, device-independent development using GitHub Codespaces and Google Cloud Platform (GCP).

### 1. Development Environment
- Use GitHub Codespaces for coding from any device.
- All dependencies and environment variables are managed in the cloud.

### 2. Environment Variables & Secrets
- Store sensitive credentials using GitHub Codespaces secrets or GCP Secret Manager.
- Example `.env.example` provided for reference.

### 3. Connecting to Cloud Services
- Database, backend, and frontend URLs are set to GCP endpoints in `.env` files.
- No local dependencies required.

### 4. Automated Deployment (CI/CD)
- Code is deployed to GCP using GitHub Actions (`.github/workflows/deploy.yml`).
- Push changes to main branch to trigger deployment.

### 5. Remote Testing & Monitoring
- Use GCP Cloud Monitoring and Firebase Console for logs and health checks.

### 6. Onboarding a New Device
1. Log in to GitHub and open Codespace for this repo.
2. Copy `.env.example` to `.env` and fill in secrets (or use Codespaces secrets).
3. Start coding and deploying!

---

For more help, see the scripts in `/scripts` or ask GitHub Copilot for guidance.

## Cloud-Based Development Workflow

This project is set up for fast, device-independent development using GitHub Codespaces and Google Cloud Platform (GCP).

### 1. Development Environment
- Use GitHub Codespaces for coding from any device.
- All dependencies and environment variables are managed in the cloud.

### 2. Environment Variables & Secrets
- Store sensitive credentials using GitHub Codespaces secrets or GCP Secret Manager.
- Example `.env.example` provided for reference.

### 3. Connecting to Cloud Services
- Database, backend, and frontend URLs are set to GCP endpoints in `.env` files.
- No local dependencies required.

### 4. Automated Deployment (CI/CD)
- Code is deployed to GCP using GitHub Actions (`.github/workflows/deploy.yml`).
- Push changes to main branch to trigger deployment.

### 5. Remote Testing & Monitoring
- Use GCP Cloud Monitoring and Firebase Console for logs and health checks.

### 6. Onboarding a New Device
1. Log in to GitHub and open Codespace for this repo.
2. Copy `.env.example` to `.env` and fill in secrets (or use Codespaces secrets).
3. Start coding and deploying!

---

For more help, see the scripts in `/scripts` or ask GitHub Copilot for guidance.

## Connect to Supabase Postgres

1) In Supabase, go to Project Settings > Database > Connection string > URI

2) Create `.env` with:

DATABASE_URL=postgres://postgres:<YOUR_PASSWORD>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require

3) Push schema and seed:

 - Optional: `npm run db:bootstrap` (connects, pushes schema, seeds if empty)
 - Or directly: `npx drizzle-kit push`

4) Start dev server:

 - Windows PowerShell:
	 `$env:NODE_ENV='development'; npm run dev`

Notes:
 - sslmode=require is recommended for Supabase.
 - The app auto-runs db bootstrap in dev on first start.