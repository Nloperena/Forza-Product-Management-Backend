import { list, put, copy, del } from '@vercel/blob';
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const blobToken = process.env.PRODUCTS_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
const databaseUrl = process.env.DATABASE_URL;

if (!blobToken || !databaseUrl) {
  console.error('Error: PRODUCTS_READ_WRITE_TOKEN and DATABASE_URL must be set');
  process.exit(1);
}

async function standardizeAssets() {
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const res = await client.query('SELECT product_id, image, tds_pdf, sds_pdf FROM products');
    const products = res.rows;

    console.log(`Processing ${products.length} products...`);

    for (const product of products) {
      const { product_id, image, tds_pdf, sds_pdf } = product;
      const updates: string[] = [];
      const values: any[] = [];

      // Helper to move file to standard location
      const standardizeFile = async (currentUrl: string | null, type: 'image' | 'tds' | 'sds') => {
        if (!currentUrl || !currentUrl.includes('vercel-storage.com')) return null;

        const extension = path.extname(new URL(currentUrl).pathname);
        const targetPath = `product-data/${product_id}/${type}${extension}`;

        // Check if already standardized
        if (currentUrl.includes(targetPath)) {
          console.log(`  [${product_id}] ${type} already standardized`);
          return currentUrl;
        }

        try {
          console.log(`  [${product_id}] Moving ${type} to ${targetPath}...`);
          
          // Copy to new location
          const newBlob = await copy(currentUrl, targetPath, {
            access: 'public',
            token: blobToken,
            addRandomSuffix: false
          });

          return newBlob.url;
        } catch (error) {
          console.error(`  [${product_id}] Failed to move ${type}:`, error);
          return currentUrl;
        }
      };

      const newImage = await standardizeFile(image, 'image');
      const newTds = await standardizeFile(tds_pdf, 'tds');
      const newSds = await standardizeFile(sds_pdf, 'sds');

      let paramIndex = 1;
      if (newImage && newImage !== image) {
        updates.push(`image = $${paramIndex++}`);
        values.push(newImage);
      }
      if (newTds && newTds !== tds_pdf) {
        updates.push(`tds_pdf = $${paramIndex++}`);
        values.push(newTds);
      }
      if (newSds && newSds !== sds_pdf) {
        updates.push(`sds_pdf = $${paramIndex++}`);
        values.push(newSds);
      }

      if (updates.length > 0) {
        values.push(product_id);
        await client.query(
          `UPDATE products SET ${updates.join(', ')} WHERE product_id = $${paramIndex}`,
          values
        );
        console.log(`  [${product_id}] Database updated`);
      }
    }

    console.log('Standardization complete!');
  } catch (error) {
    console.error('Error during standardization:', error);
  } finally {
    await client.end();
  }
}

standardizeAssets();

