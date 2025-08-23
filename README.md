# tally-to-cash

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