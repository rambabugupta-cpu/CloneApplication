import { neon, Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import ws from 'ws';
import * as schema from "@shared/schema";

// Configure WebSocket for Pool connection
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use HTTP connection for Drizzle ORM
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle({ client: sql, schema });

// Export pool for session store with WebSocket support
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });