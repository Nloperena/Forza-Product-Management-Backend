import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';

const MAPPING: Record<string, string> = {
  'R-A2000': 'R-A2000 Tote.png',
  'R-C661': 'R-C661 Drum.png',
  'R-OS8': 'R-OS8 Cartridge.png',
  'R-OS84': 'R-OS84 Cartridge.png',
  'R-OSA': 'R-OSA Tin Can.png',
  'R-R820': 'R-R820 2 Part.png',
  'R-T600': 'R-T600 Tape.png',
  'R-T620': 'R-T620 Tape.png',
  'R-T860': 'R-T860 Tape.png',
  'RC826': 'RC826 Aerosol.png',
  'RC862': 'RC862 22L.png',
  'RC863': 'RC863 22L and Aerosol.png',
  'RC864': 'RC864 22L and Aerosol.png',
  'RC886': 'RC886 22L and Aerosol.png',
  'RC887': 'RC887 22L.png'
};

const VERCEL_BASE = 'https://jw4to4yw6mmciodr.public.blob.vercel-storage.com/product-images';

async function updateProductionInsulationImages() {
  console.log('🚀 Starting DIRECT Database Update for Insulation Images...');
  
  try {
    await databaseService.connect();
    await databaseService.initializeDatabase();
    const isPostgres = databaseService.isPostgres();
    const client = isPostgres ? await databaseService.getClient() : null;
    const db = !isPostgres ? databaseService.getDatabase() : null;

    let totalUpdated = 0;

    for (const [pid, fileName] of Object.entries(MAPPING)) {
      const newUrl = `${VERCEL_BASE}/Insulation/${fileName}`;

      if (isPostgres && client) {
        const result = await client.query(
          'UPDATE products SET image = $1 WHERE product_id = $2 OR image LIKE $3 RETURNING product_id',
          [newUrl, pid, `%/${pid.toLowerCase()}.png`]
        );
        if (result.rowCount && result.rowCount > 0) {
          console.log(`✅ Updated ${pid} in Postgres (${result.rowCount} rows)`);
          totalUpdated += result.rowCount;
        }
      } else if (db) {
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE products SET image = ? WHERE product_id = ? OR image LIKE ?',
            [newUrl, pid, `%/${pid.toLowerCase()}.png`],
            function(err) {
              if (err) reject(err);
              else {
                if (this.changes > 0) {
                  console.log(`✅ Updated ${pid} in SQLite (${this.changes} rows)`);
                  totalUpdated += this.changes;
                }
                resolve(null);
              }
            }
          );
        });
      }
    }

    console.log(`\n🎉 Finished! Total updates: ${totalUpdated}`);
    
    if (client) client.release();
  } catch (error) {
    console.error('❌ Error during direct update:', error);
  }
  // Note: Don't close the pool here - let the database service manage it
}

if (require.main === module) {
  updateProductionInsulationImages().catch(console.error);
}

export { updateProductionInsulationImages };






