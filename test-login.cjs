// Test password verification
require('dotenv').config();
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

async function testLogin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Testing login credentials...\n');
    
    // Test credentials
    const testCases = [
      { email: 'owner@example.com', password: 'admin123' },
      { email: 'admin@example.com', password: 'admin123' },
      { email: 'staff1@example.com', password: 'staff123' },
    ];

    for (const { email, password } of testCases) {
      console.log(`Testing: ${email} with password: ${password}`);
      
      // Get user from database
      const result = await pool.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);
      
      if (result.rows.length === 0) {
        console.log(`❌ User not found: ${email}\n`);
        continue;
      }

      const user = result.rows[0];
      console.log(`✓ User found: ${user.email}`);
      console.log(`  Password hash: ${user.password_hash.substring(0, 20)}...`);
      
      // Test password
      const isValid = await bcrypt.compare(password, user.password_hash);
      console.log(`  Password test: ${isValid ? '✅ VALID' : '❌ INVALID'}\n`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

testLogin();
