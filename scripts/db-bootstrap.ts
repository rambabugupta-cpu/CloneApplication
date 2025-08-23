/* Local database bootstrap & automation script
 * Tasks:
 * 1. Parse DATABASE_URL
 * 2. For localhost force sslmode=disable & PGSSLMODE=disable
 * 3. If target database missing -> create it via maintenance DB (postgres)
 * 4. Run drizzle-kit push (schema sync)
 * 5. Seed database (idempotent � seed script skips if data present)
 */
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { execSync } from 'node:child_process';

// Load environment variables from .env file
dotenv.config();

const REQUIRED_ENV = ['DATABASE_URL'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`[bootstrap] Missing ${key} in environment (.env)`);
    process.exit(1);
  }
}

let originalUrl = process.env.DATABASE_URL!;

interface ConnInfo { user:string; password:string; host:string; port:number; database:string; search:string; sslMode:string; }
function parse(urlStr: string): ConnInfo {
  const u = new URL(urlStr);
  return {
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    host: u.hostname,
    port: parseInt(u.port || '5432', 10),
    database: u.pathname.replace(/^\//, ''),
    search: u.search,
    sslMode: (u.searchParams.get('sslmode') || '').toLowerCase(),
  };
}

let info = parse(originalUrl);

// Force disable SSL only for local dev; keep sslmode=require for hosted (e.g., Supabase)
if ((info.host === 'localhost' || info.host === '127.0.0.1') && info.sslMode !== 'disable') {
  if (!info.search.includes('sslmode=')) {
    originalUrl += (originalUrl.includes('?') ? '&' : '?') + 'sslmode=disable';
    process.env.DATABASE_URL = originalUrl;
    info = parse(originalUrl);
    console.log('[bootstrap] Added sslmode=disable to local DATABASE_URL');
  }
  process.env.PGSSLMODE = 'disable';
}

async function databaseExists(): Promise<boolean> {
  const maintenanceUrl = originalUrl.replace(info.database, 'postgres');
  const pool = new Pool({ connectionString: maintenanceUrl, ssl: false });
  try {
    const res = await pool.query('SELECT 1 FROM pg_database WHERE datname = $1', [info.database]);
    await pool.end();
    return res.rowCount === 1;
  } catch (e) {
    await pool.end();
    throw e;
  }
}

async function createDatabaseIfMissing() {
  try {
    const exists = await databaseExists();
    if (exists) {
      console.log('[bootstrap] Database exists');
      return;
    }
    const maintenanceUrl = originalUrl.replace(info.database, 'postgres');
    const pool = new Pool({ connectionString: maintenanceUrl, ssl: false });
    console.log(`[bootstrap] Creating database ${info.database}`);
    await pool.query(`CREATE DATABASE "${info.database}"`);
    await pool.end();
    console.log('[bootstrap] Database created');
  } catch (e: any) {
    if (/already exists/i.test(e.message)) {
      console.log('[bootstrap] Database already exists (race)');
    } else {
      console.error('[bootstrap] Failed to create database:', e.message);
      process.exit(1);
    }
  }
}

async function testConnection() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL!, ssl: false });
  try {
    const { rows } = await pool.query('SELECT current_database() as db, 1 as ok');
    console.log('[bootstrap] Connection OK ->', rows[0]);
    await pool.end();
  } catch (e: any) {
    if (/does not exist/.test(e.message)) {
      console.log('[bootstrap] Target database missing, creating...');
      await pool.end();
      await createDatabaseIfMissing();
      return testConnection();
    }
    if (/SSL/.test(e.message)) {
      console.error('[bootstrap] SSL negotiation problem. Ensure sslmode=disable for local server.');
    }
    console.error('[bootstrap] Connection failed:', e.message);
    process.exit(1);
  }
}

function run(cmd: string) {
  console.log(`[bootstrap] $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

function runDrizzlePush() {
  try {
    run('npx drizzle-kit push');
  } catch (e) {
    console.error('[bootstrap] drizzle-kit push failed');
    process.exit(1);
  }
}

async function seed() {
  try {
    // Import TypeScript directly (tsx runtime executes it). Use explicit extension.
    const seedMod: any = await import('../server/seed.ts');
    if (seedMod.seedDatabase) {
      console.log('[bootstrap] Seeding (idempotent)');
      await seedMod.seedDatabase();
    } else {
      console.log('[bootstrap] seedDatabase export not found � skipping');
    }
  } catch (e: any) {
    console.warn('[bootstrap] Seed skipped:', e.message);
  }
}

(async () => {
  await testConnection();
  runDrizzlePush();
  await seed();
  console.log('[bootstrap] Complete');
})();
