import * as fs from 'fs';
import * as path from 'path';

const JSON_FILE_PATHS = [
  path.join(__dirname, '../../data/forza_products_organized.json'),
  path.join(__dirname, '../../backend-import.json'),
  path.join(__dirname, '../../known-vercel-scraping-report.json'),
  path.join(__dirname, '../../vercel-blob-scraping-report.json')
];

const MAPPING: Record<string, string> = {
  // Provided by user
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
  
  // missing from user list but in Marine/Composite category
  'M-C283': 'M-C283 5 gal Pail.png',
  'MC736': 'MC736 Canister and Aerosol.png',
  'MC739': 'MC739 Canister and Aerosol.png',
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

async function globalReplace() {
  for (const filePath of JSON_FILE_PATHS) {
    if (!fs.existsSync(filePath)) continue;
    console.log(`📄 Processing ${path.basename(filePath)}...`);
    let content = fs.readFileSync(filePath, 'utf-8');
    let replaced = false;

    for (const [pid, newFile] of Object.entries(MAPPING)) {
      const folder = pid.startsWith('TAC-') ? 'Composites' : 'Marine';
      const newUrl = `${VERCEL_BASE}/${folder}/${newFile}`;
      
      // Be very broad: replace ANY string ending in pid.png or pid.png"
      const patterns = [
        new RegExp(`https?://[^"\\s]+/${pid}\\.png`, 'gi'),
        new RegExp(`https?://[^"\\s]+/${pid.toLowerCase()}\\.png`, 'gi'),
        new RegExp(`"/product-images/${pid}\\.png"`, 'gi'),
        new RegExp(`"/product-images/${pid.toLowerCase()}\\.png"`, 'gi')
      ];

      for (const pattern of patterns) {
        if (pattern.test(content)) {
          content = content.replace(pattern, (match) => {
            if (match.startsWith('"')) return `"${newUrl}"`;
            return newUrl;
          });
          replaced = true;
        }
      }
    }

    if (replaced) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`🎉 Global replacements done in ${path.basename(filePath)}`);
    }
  }
}

globalReplace().catch(console.error);

