import * as fs from 'fs';
import * as path from 'path';
import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';

const JSON_FILE_PATHS = [
  path.join(__dirname, '../../data/forza_products_organized.json'),
  path.join(__dirname, '../../backend-import.json')
];

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
  'TAC-739R': 'TAC-739R Canister and Aerosol.png'
};

const VERCEL_BASE = 'https://jw4to4yw6mmciodr.public.blob.vercel-storage.com/product-images';

async function updateEverything() {
  console.log('🚀 Starting Global Marine/Composite Image Update...');

  // 1. Update JSON files
  for (const jsonPath of JSON_FILE_PATHS) {
    if (!fs.existsSync(jsonPath)) continue;
    console.log(`📄 Processing ${path.basename(jsonPath)}...`);
    let content = fs.readFileSync(jsonPath, 'utf-8');
    let updateCount = 0;

    // Direct string replacement for image URLs in the JSON text
    // This catches products that might share images or have old lowercase names
    for (const [pid, newFile] of Object.entries(MAPPING)) {
      const folder = pid.startsWith('TAC-') ? 'Composites' : 'Marine';
      const newUrl = `${VERCEL_BASE}/${folder}/${newFile}`;
      
      // Patterns to match: 
      // 1. The exact old URL (maybe lowercase)
      // 2. The PID based URL
      const patterns = [
        new RegExp(`${VERCEL_BASE}/${folder}/${pid}.png`, 'gi'),
        new RegExp(`${VERCEL_BASE}/${folder}/${pid.toLowerCase()}.png`, 'gi'),
        // Also handle cases where industry might be wrong in existing URL
        new RegExp(`${VERCEL_BASE}/[^/]+/${pid}.png`, 'gi'),
        new RegExp(`${VERCEL_BASE}/[^/]+/${pid.toLowerCase()}.png`, 'gi')
      ];

      for (const pattern of patterns) {
        if (pattern.test(content)) {
          content = content.replace(pattern, newUrl);
          updateCount++;
        }
      }
    }

    if (updateCount > 0) {
      fs.writeFileSync(jsonPath, content, 'utf-8');
      console.log(`🎉 Updated ${updateCount} occurrences in ${path.basename(jsonPath)}`);
    }
  }

  // 2. Update Database
  try {
    console.log('🔌 Connecting to database...');
    await databaseService.connect();
    const productModel = databaseService.isPostgres() 
      ? new ProductModel() 
      : new ProductModel(databaseService.getDatabase());
    
    const products = await productModel.getAllProducts();
    let dbUpdates = 0;

    for (const product of products) {
      const pid = product.product_id;
      // We check if this product should have its image updated based on our mapping
      // OR if its current image URL contains a PID that is in our mapping
      
      let matchedPid = null;
      if (MAPPING[pid]) {
        matchedPid = pid;
      } else {
        // Check if current image filename matches one of our mapped PIDs
        for (const targetPid of Object.keys(MAPPING)) {
          if (product.image?.toLowerCase().includes(`/${targetPid.toLowerCase()}.png`)) {
            matchedPid = targetPid;
            break;
          }
        }
      }

      if (matchedPid) {
        const folder = matchedPid.startsWith('TAC-') ? 'Composites' : 'Marine';
        const newUrl = `${VERCEL_BASE}/${folder}/${MAPPING[matchedPid]}`;
        
        if (product.image !== newUrl) {
          await productModel.updateProduct(product.id, { image: newUrl });
          dbUpdates++;
          console.log(`✅ Updated DB: ${pid} -> ${MAPPING[matchedPid]}`);
        }
      }
    }
    console.log(`🎉 Updated ${dbUpdates} products in database`);
  } catch (e) {
    console.error('❌ DB Update Error:', e);
  } finally {
    if (databaseService.isPostgres()) {
      const pool = (databaseService as any).pool;
      if (pool) await pool.end();
    }
  }
}

updateEverything().catch(console.error);



