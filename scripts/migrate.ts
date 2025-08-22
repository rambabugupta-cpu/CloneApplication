/* Automatic migration + seed orchestrator
 * 1. Ensure DB exists and ssl disabled locally (reuse logic by invoking db-bootstrap)
 * 2. Generate new migration if schema changed
 * 3. Apply migrations
 * 4. Run seed (idempotent)
 */
import { execSync } from 'node:child_process';

function run(cmd: string) {
  console.log(`[migrate] $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

function main() {
  if (!process.env.DATABASE_URL) {
    console.error('[migrate] DATABASE_URL missing');
    process.exit(1);
  }
  // Step 1: bootstrap (creates DB, pushes current schema & seeds)
  run('npm run db:bootstrap');
  // Step 2: generate migration (drizzle-kit diff) - only if there are changes
  try {
    run('npx drizzle-kit generate:pg');
  } catch (e) {
    console.warn('[migrate] generate:pg failed or no changes. Continuing.');
  }
  // Step 3: apply migrations (push already did; re-run safe)
  try {
    run('npx drizzle-kit push');
  } catch (e) {
    console.warn('[migrate] push re-run failed (likely already in sync).');
  }
  console.log('[migrate] Done');
}

main();
