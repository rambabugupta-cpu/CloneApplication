// Quick script to check database users
require('dotenv').config();
const { Pool } = require('pg');

async function checkUsers() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    const result = await pool.query('SELECT id, email, full_name, role, status FROM users LIMIT 10');
    
    console.log('\n=== Users in database ===');
    console.table(result.rows);
    
    console.log('\n=== Checking specific test credentials ===');
    const testEmails = ['owner@example.com', 'admin@example.com', 'staff1@example.com'];
    
    for (const email of testEmails) {
      const userResult = await pool.query('SELECT id, email, full_name, role, status, created_at FROM users WHERE email = $1', [email]);
      if (userResult.rows.length > 0) {
        console.log(`✓ Found user: ${email}`, userResult.rows[0]);
      } else {
        console.log(`✗ User not found: ${email}`);
      }
    }
    
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers();
