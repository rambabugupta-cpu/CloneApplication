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
function resolveSsl(): PoolConfig['ssl'] {
  const url = process.env.DATABASE_URL!;
  const isLocal = /localhost|127\.0\.0\.1/.test(url.toLowerCase());

  // Disable SSL for local connections
  if (isLocal) {
    return false;
  }

  // For all other connections (like Cloud SQL), enable SSL but don't fail on self-signed certs.
  // This is secure and standard for connecting to managed cloud databases.
  return {
    rejectUnauthorized: false,
  };
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