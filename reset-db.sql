-- Reset database schema for Replit Auth migration
-- This script handles the migration from UUID-based user IDs to varchar for Replit Auth

-- First drop all foreign key constraints and dependent tables
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS communication_edits CASCADE;
DROP TABLE IF EXISTS payment_edits CASCADE;
DROP TABLE IF EXISTS communications CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS collections CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS import_batches CASCADE;
DROP TABLE IF EXISTS session CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- This will allow drizzle-kit push to recreate all tables with the correct schema