import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function cleanProductName(name: string, productId: string): string {
  if (!name) return productId;
  
  let cleaned = name.trim();
  
  // Remove brand prefixes
  cleaned = cleaned.replace(/^ForzaBOND®\s*/i, '');
  cleaned = cleaned.replace(/^ForzaTAPE®\s*/i, '');
  cleaned = cleaned.replace(/^ForzaSEAL®\s*/i, '');
  cleaned = cleaned.replace(/^ForzaCLEAN®\s*/i, '');
  cleaned = cleaned.replace(/^ForzaBOND\s*/i, '');
  cleaned = cleaned.replace(/^ForzaTAPE\s*/i, '');
  cleaned = cleaned.replace(/^ForzaSEAL\s*/i, '');
  cleaned = cleaned.replace(/^ForzaCLEAN\s*/i, '');
  
  // Remove product ID if it's at the start (to avoid duplication)
  // Also remove any dashes or spaces after the product ID
  cleaned = cleaned.replace(new RegExp(`^${productId}\\s*[-–—]?\\s*`, 'i'), '');
  cleaned = cleaned.trim();
  
  // Format as "ProductID - Product Name" (using regular hyphen)
  if (cleaned && cleaned !== productId) {
    return `${productId} - ${cleaned}`;
  }
  return productId;
}

async function fixProductNames() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get all products
    const result = await client.query('SELECT product_id, name, full_name FROM products');
    
    console.log(`Found ${result.rows.length} products to check...`);
    
    let updated = 0;
    for (const row of result.rows) {
      const productId = row.product_id;
      const oldName = row.name;
      const oldFullName = row.full_name;
      
      const newName = cleanProductName(oldName, productId);
      const newFullName = cleanProductName(oldFullName, productId);
      
      if (newName !== oldName || newFullName !== oldFullName) {
        await client.query(
          'UPDATE products SET name = $1, full_name = $2, updated_at = $3 WHERE product_id = $4',
          [newName, newFullName, new Date().toISOString(), productId]
        );
        console.log(`Updated ${productId}: "${oldName}" -> "${newName}"`);
        updated++;
      }
    }
    
    await client.query('COMMIT');
    console.log(`\n✅ Updated ${updated} product names`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixProductNames().catch(console.error);

