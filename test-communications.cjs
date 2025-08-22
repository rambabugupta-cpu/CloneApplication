// Test communication creation and retrieval
require('dotenv').config();
const { Pool } = require('pg');

async function testCommunications() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('=== Testing Communication Creation and Retrieval ===\n');
    
    // Get a collection ID to test with
    const collectionsResult = await pool.query('SELECT id, invoice_number FROM collections LIMIT 1');
    if (collectionsResult.rows.length === 0) {
      console.log('No collections found in database');
      return;
    }
    
    const testCollectionId = collectionsResult.rows[0].id;
    const invoiceNumber = collectionsResult.rows[0].invoice_number;
    console.log(`Testing with collection: ${invoiceNumber} (${testCollectionId})\n`);
    
    // Check existing communications for this collection
    const existingComms = await pool.query(
      'SELECT id, type, content, created_at FROM communications WHERE collection_id = $1 ORDER BY created_at DESC',
      [testCollectionId]
    );
    
    console.log(`Existing communications for this collection: ${existingComms.rows.length}`);
    existingComms.rows.forEach((comm, index) => {
      console.log(`  ${index + 1}. ${comm.type} - ${comm.content.substring(0, 50)}... (${comm.created_at})`);
    });
    
    // Test latest communication query (same as in searchCollections)
    const latestCommQuery = `
      SELECT 
        collection_id,
        id,
        type,
        content,
        outcome,
        promised_amount,
        promised_date,
        next_action_required,
        next_action_date,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY collection_id ORDER BY created_at DESC) as rn
      FROM communications 
      WHERE collection_id = $1
    `;
    
    const latestResult = await pool.query(latestCommQuery, [testCollectionId]);
    console.log('\n=== Latest Communication Query Result ===');
    latestResult.rows.forEach(row => {
      console.log(`RN: ${row.rn}, Type: ${row.type}, Content: ${row.content?.substring(0, 50)}..., Created: ${row.created_at}`);
    });
    
    const latestComm = latestResult.rows.find(row => row.rn == 1); // Use == instead of ===
    if (latestComm) {
      console.log('\n=== Latest Communication (RN=1) ===');
      console.log(JSON.stringify(latestComm, null, 2));
    } else {
      console.log('\n❌ No latest communication found!');
      console.log('RN values found:', latestResult.rows.map(r => r.rn));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

testCommunications();
