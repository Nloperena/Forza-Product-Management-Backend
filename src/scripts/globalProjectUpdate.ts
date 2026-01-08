import * as fs from 'fs';
import * as path from 'path';

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

function walkDir(dir: string, callback: (filePath: string) => void) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next' && file !== 'dist') {
        walkDir(filePath, callback);
      }
    } else {
      callback(filePath);
    }
  }
}

function updateFile(filePath: string) {
  if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  let newContent = content;
  let updated = false;

  for (const [productId, filename] of Object.entries(INDUSTRIAL_IMAGE_MAPPING)) {
    // Search for old URLs ending in productId.png or similar
    const oldFilename = `${productId.toLowerCase()}.png`;
    const oldUrlPart = `/product-images/Industrial/${oldFilename}`;
    const newUrlPart = `/product-images/Industrial/${filename}`;
    
    if (newContent.includes(oldUrlPart)) {
      newContent = newContent.split(oldUrlPart).join(newUrlPart);
      updated = true;
    }
    
    // Also check for the exact productId.png if it's not preceded by the folder
    const exactOld = `${productId}.png`;
    if (newContent.includes(exactOld) && !newContent.includes(filename)) {
       // Only replace if it's likely a URL ending
       // This is a bit risky but we're trying to be thorough
       // We'll focus on JSON files mostly
       if (filePath.endsWith('.json')) {
         newContent = newContent.split(`"${exactOld}"`).join(`"${filename}"`);
         updated = true;
       }
    }
  }

  if (updated) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`✅ Updated ${filePath}`);
  }
}

console.log('🚀 Starting global project update for industrial images...');
walkDir('.', updateFile);
console.log('🎉 Global update finished!');

