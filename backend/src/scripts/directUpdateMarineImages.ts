import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';

const MAPPING: Record<string, string> = {
  'M-C280': 'M-C280 5 gal Pail.png',
  'M-C285': 'M-C285 5 gal Pail.png',
  'M-OA755': 'M-OA755 Cartridge.png',
  'M-OS764': 'M-OS764 Sausage.png',
  'M-OS789': 'M-OS789 Sausage.png',
  'M-OS796': 'M-OS796 Cartridge.png',
  'M-OSA783': 'M-OSA783 Tin Can.png',
  'M-R420': 'M-R420 2 Part.png',
  'M-R445': 'M-R445 2 Part.png',
  'M-S750': 'M-S750 1 gal Pail.png',
  'M-T815': 'M-T815 Tape.png',
  'M-T820': 'M-T820 Tape.png',
  'MC722': 'MC722 Canister.png',
  'MC723': 'MC723 Canister and Aerosol.png',
  'MC724': 'MC724 Canister and Aerosol.png',
  'MC737': 'MC737 Canister.png',
  'MC741': 'MC741 Canister.png',
  'TAC-734G': 'TAC-734G Canister and Aerosol.png',
  'TAC-735R': 'TAC-735R Canister and Aerosol.png',
  'TAC-738R': 'TAC-738R Canister and Aerosol.png',
  'TAC-739R': 'TAC-739R Canister and Aerosol.png',
  'MC739': 'MC739 Canister and Aerosol.png',
  'M-C283': 'M-C283 5 gal Pail.png',
  'MC736': 'MC736 Canister and Aerosol.png',
  'M-R478': 'M-R478 2 Part.png',
  'TAC-745': 'TAC-745 Aerosol.png',
  'TAC-850GR': 'TAC-850GR Canister.png',
  'TAC-OS7': 'TAC-OS7 Sausage.png',
  'TAC-OS74': 'TAC-OS74 Cartridge.png',
  'TAC-OS75': 'TAC-OS75 Cartridge.png',
  'TAC-R750': 'TAC-R750 2 Part.png',
  'TAC-R760': 'TAC-R760 2 Part.png',
  'TAC-R777': 'TAC-R777 2 Part.png',
  'TAC-T700': 'TAC-T700 Tape.png'
};

const VERCEL_BASE = 'https://jw4to4yw6mmciodr.public.blob.vercel-storage.com/product-images';

async function updateProductionMarineImages() {
  console.log('🚀 Starting DIRECT Database Update for Marine/Composite Images...');
  
  try {
    await databaseService.connect();
    const isPostgres = databaseService.isPostgres();
    const client = isPostgres ? await (databaseService as any).pool.connect() : null;
    const db = !isPostgres ? databaseService.getDatabase() : null;

    let totalUpdated = 0;

    for (const [pid, fileName] of Object.entries(MAPPING)) {
      const folder = pid.startsWith('TAC-') ? 'Composites' : 'Marine';
      const newUrl = `${VERCEL_BASE}/${folder}/${fileName}`;

      if (isPostgres && client) {
        const result = await client.query(
          'UPDATE products SET image = $1 WHERE product_id = $2 OR image LIKE $3 RETURNING product_id',
          [newUrl, pid, `%/${pid.toLowerCase()}.png`]
        );
        if (result.rowCount > 0) {
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
  } finally {
    if (databaseService.isPostgres()) {
      await (databaseService as any).pool.end();
    }
  }
}

if (require.main === module) {
  updateProductionMarineImages().catch(console.error);
}

export { updateProductionMarineImages };

