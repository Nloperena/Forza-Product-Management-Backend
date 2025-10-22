const { Pool } = require('pg');

// Vercel Blob base URL - this should match your actual Vercel Blob storage URL
const VERCEL_BLOB_BASE_URL = 'https://rifer2chtzhht7fs.public.blob.vercel-storage.com';

async function fixImageUrls() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔧 Starting image URL fix...');
    
    // Get all products with image filenames (not full URLs)
    const result = await pool.query(`
      SELECT id, name, image 
      FROM products 
      WHERE image IS NOT NULL 
      AND image != 'placeholder-product.svg'
      AND image NOT LIKE 'https://%'
      AND image NOT LIKE 'http://%'
    `);

    console.log(`Found ${result.rows.length} products with filename-based images`);

    let updatedCount = 0;

    for (const product of result.rows) {
      try {
        // Construct the Vercel Blob URL
        const blobUrl = `${VERCEL_BLOB_BASE_URL}/${product.image}`;
        
        // Update the product with the full Vercel Blob URL
        await pool.query(
          'UPDATE products SET image = $1 WHERE id = $2',
          [blobUrl, product.id]
        );
        
        updatedCount++;
        console.log(`✅ Updated: ${product.name} -> ${blobUrl}`);
        
      } catch (error) {
        console.error(`❌ Error updating product ${product.name}:`, error);
      }
    }

    console.log(`🎉 Image URL fix completed!`);
    console.log(`✅ Products updated: ${updatedCount}`);

  } catch (error) {
    console.error('❌ Image URL fix failed:', error);
  } finally {
    await pool.end();
  }
}

fixImageUrls();
