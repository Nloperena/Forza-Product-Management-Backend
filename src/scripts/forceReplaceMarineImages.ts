import * as fs from 'fs';
import * as path from 'path';

const JSON_FILE_PATH = path.join(__dirname, '../../data/forza_products_organized.json');

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

async function forceReplaceAll() {
  console.log('🔥 Starting Force Replace All for Marine/Composite Images...');
  
  if (!fs.existsSync(JSON_FILE_PATH)) {
    console.error(`❌ JSON not found: ${JSON_FILE_PATH}`);
    return;
  }

  let content = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
  let totalReplacements = 0;

  for (const [pid, newFile] of Object.entries(MAPPING)) {
    const folder = pid.startsWith('TAC-') ? 'Composites' : 'Marine';
    const newUrl = `${VERCEL_BASE}/${folder}/${newFile}`;
    
    // We want to replace ANY image URL that contains the PID.png or pid.png
    const patterns = [
      new RegExp(`${VERCEL_BASE}/[^/]+/${pid}\\.png`, 'g'),
      new RegExp(`${VERCEL_BASE}/[^/]+/${pid.toLowerCase()}\\.png`, 'g'),
      // Also catch ones that might have missed the folder
      new RegExp(`${VERCEL_BASE}/${pid}\\.png`, 'g'),
      new RegExp(`${VERCEL_BASE}/${pid.toLowerCase()}\\.png`, 'g')
    ];

    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        console.log(`✅ Found ${matches.length} occurrences of ${pid} image pattern. Replacing...`);
        content = content.replace(pattern, newUrl);
        totalReplacements += matches.length;
      }
    }
  }

  if (totalReplacements > 0) {
    fs.writeFileSync(JSON_FILE_PATH, content, 'utf-8');
    console.log(`🎉 Successfully replaced ${totalReplacements} image URLs in JSON.`);
  } else {
    console.log('⚠️ No more occurrences found to replace.');
  }
}

forceReplaceAll().catch(console.error);

