import dotenv from 'dotenv';
import { Pool, PoolConfig } from 'pg';
// @ts-ignore - drizzle import works at runtime but has type issues
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

// Load environment variables from .env file
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

/**
 * Decide SSL usage automatically based on environment & connection string.
 * - Local (localhost / 127.0.0.1) -> disable SSL
 * - Explicit DATABASE_SSL=true -> enable SSL (relaxed)
 * - Neon / common hosted domains -> enable SSL (relaxed)
 * - sslmode=disable in URL -> disable regardless
 * - sslmode=require / verify-* -> enable (relaxed here, can be tightened later)
 */
function resolveSsl(): false | { rejectUnauthorized: boolean } {
  const url = process.env.DATABASE_URL!;
  const lower = url.toLowerCase();

  // If URL explicitly disables ssl
  if (/(?:[?&])sslmode=disable/.test(lower)) return false;

  // If user forces via env
  if (process.env.DATABASE_SSL === 'false') return false;
  if (process.env.DATABASE_SSL === 'true') return { rejectUnauthorized: false };

  // Detect localhost
  if (/localhost|127\.0\.0\.1/.test(lower)) return false;

  // If URL asks for sslmode=require
  if (/(?:[?&])sslmode=(require|verify-full|verify-ca)/.test(lower)) {
    return { rejectUnauthorized: false }; // relaxed for dev; tighten in prod
  }

  // Common hosted providers (extend as needed)
  if (/neon\.tech|render\.com|aws|azure|herokuapp\.com/.test(lower)) {
    return { rejectUnauthorized: false };
  }

  // Default: no SSL for safety in local migrations
  return false;
}

const sslConfig = resolveSsl();

// Ensure libpq tools (psql) also do not try SSL locally if we disabled it
if (sslConfig === false && !process.env.PGSSLMODE) {
  process.env.PGSSLMODE = 'disable';
}

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig,
  max: parseInt(process.env.DB_POOL_MAX || '5'),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// One-time log (avoid noisy logs in tests)
if (!process.env.SUPPRESS_DB_LOGS) {
  // eslint-disable-next-line no-console
  console.log('[db] Creating pool', {
    ssl: sslConfig ? 'enabled' : 'disabled',
    host: process.env.DATABASE_URL?.replace(/:\/\/.*@/, '://****:****@'),
  });
}

export const pool = new Pool(poolConfig);
export const db = drizzle(pool, { schema });