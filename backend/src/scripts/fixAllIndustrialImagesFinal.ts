import * as fs from 'fs';
import * as path from 'path';

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

async function main() {
  const jsonPath = path.join(__dirname, '../../data/forza_products_organized.json');
  console.log(`📁 Processing ${jsonPath}...`);
  
  const content = fs.readFileSync(jsonPath, 'utf-8');
  let data = JSON.parse(content);
  
  let updatedCount = 0;
  
  const updateItem = (item: any) => {
    if (item.product_id && INDUSTRIAL_IMAGE_MAPPING[item.product_id]) {
      const expectedUrl = `${VERCEL_BLOB_BASE_URL}/product-images/${INDUSTRY_FOLDER}/${INDUSTRIAL_IMAGE_MAPPING[item.product_id]}`;
      if (item.image !== expectedUrl) {
        console.log(`✅ Updating ${item.product_id}: ${item.image} -> ${expectedUrl}`);
        item.image = expectedUrl;
        updatedCount++;
      }
    }
  };
  
  const traverse = (obj: any) => {
    if (Array.isArray(obj)) {
      obj.forEach(item => traverse(item));
    } else if (obj && typeof obj === 'object') {
      updateItem(obj);
      Object.values(obj).forEach(val => traverse(val));
    }
  };
  
  traverse(data);
  
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`\n📊 Summary: Updated ${updatedCount} items in JSON`);
}

main();

