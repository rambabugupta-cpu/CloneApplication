import { neon, Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use HTTP connection instead of websocket to avoid connection issues
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle({ client: sql, schema });

// Export pool for session store
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });