import { Pool } from 'pg';

// Exact mapping from user's list
const INDUSTRIAL_IMAGE_MAPPING: Record<string, string> = {
  '81-0389': '81-0389 5 gal pail.png',
  'C130': 'C130 Drum.png',
  'C150': 'C150 1 gal pail.png',
  'C331': 'C331 5 gal Pail.png',
  'CA1000': 'CA1000 Container.png',
  'CA1500': 'CA1500 Container.png',
  'CA2400': 'CA2400 Container.png',
  'FRP': 'FRP 3.5 gal pail.png',
  'IC932': 'IC932 Canister.png',
  'IC933': 'IC933 Canister and Aerosol.png',
  'IC934': 'IC934 Canister and Aerosol.png',
  'IC946': 'IC946 Canister and Aerosol.png',
  'IC947': 'IC947 Canister.png',
  'OA12': 'OA12 Cartridge.png',
  'OA13': 'OA13 Cartridge.png',
  'OA4': 'OA4 Cartridge.png',
  'OA23': 'OA23 Sausage.png',
  'OS2': 'OS2 Cartridge.png',
  'OS10': 'OS10 Cartridge.png',
  'OS20': 'OS20 Sausage.png',
  'OS24': 'OS24 Cartridge.png',
  'OS25': 'OS25 Cartridge.png',
  'OS31': 'OS31 Cartridge.png',
  'OS35': 'OS35 Cartridge.png',
  'OS37': 'OS37 Cartridge.png',
  'OS61': 'OS61 Cartridge.png',
  'OSA': 'OSA tin can.png',
  'R160': 'R160 2 part.png',
  'R221': 'R221 2 part.png',
  'R519': 'R519 2 part.png',
  'S228': 'S228 1 gal pail.png',
};

const VERCEL_BLOB_BASE_URL = 'https://jw4to4yw6mmciodr.public.blob.vercel-storage.com';
const INDUSTRY_FOLDER = 'Industrial';

async function updateProductionImages() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Updating production database image URLs...\n');
    console.log('🔌 Connected to database\n');

    let updatedCount = 0;
    let errorCount = 0;

    for (const [productId, filename] of Object.entries(INDUSTRIAL_IMAGE_MAPPING)) {
      const expectedUrl = `${VERCEL_BLOB_BASE_URL}/product-images/${INDUSTRY_FOLDER}/${filename}`;
      
      try {
        // Get current value
        const checkResult = await pool.query(
          'SELECT id, product_id, image FROM products WHERE product_id = $1',
          [productId]
        );

        if (checkResult.rows.length === 0) {
          console.log(`⚠️  ${productId}: Not found in database`);
          continue;
        }

        const currentImage = checkResult.rows[0].image;
        
        if (currentImage !== expectedUrl) {
          // Update the product
          await pool.query(
            'UPDATE products SET image = $1, updated_at = CURRENT_TIMESTAMP WHERE product_id = $2',
            [expectedUrl, productId]
          );
          
          updatedCount++;
          console.log(`✅ ${productId}:`);
          console.log(`   Old: ${currentImage}`);
          console.log(`   New: ${expectedUrl}\n`);
        } else {
          console.log(`✓ ${productId}: Already correct\n`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
      }
    }

    console.log('='.repeat(80));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Updated: ${updatedCount} products`);
    console.log(`❌ Errors: ${errorCount} products`);
    console.log(`📋 Total in mapping: ${Object.keys(INDUSTRIAL_IMAGE_MAPPING).length}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  updateProductionImages()
    .then(() => {
      console.log('\n🎉 Update completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Update failed:', error);
      process.exit(1);
    });
}

export { updateProductionImages };

