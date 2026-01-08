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

async function updateAllJsonFiles() {
  const files = [
    path.join(__dirname, '../../data/forza_products_organized.json'),
    path.join(__dirname, '../../backend-import.json')
  ];

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      continue;
    }

    console.log(`📁 Updating ${filePath}...`);
    const content = fs.readFileSync(filePath, 'utf-8');
    let data = JSON.parse(content);

    let updatedCount = 0;

    const updateInObj = (obj: any) => {
      if (Array.isArray(obj)) {
        obj.forEach(item => updateInObj(item));
      } else if (obj && typeof obj === 'object') {
        if (obj.product_id) {
          const productId = obj.product_id;
          const expectedFilename = INDUSTRIAL_IMAGE_MAPPING[productId];
          if (expectedFilename) {
            const expectedUrl = `${VERCEL_BLOB_BASE_URL}/product-images/${INDUSTRY_FOLDER}/${expectedFilename}`;
            if (obj.image !== expectedUrl) {
              obj.image = expectedUrl;
              updatedCount++;
            }
          }
        }
        Object.keys(obj).forEach(key => updateInObj(obj[key]));
      }
    };

    updateInObj(data);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✅ Updated ${updatedCount} products in ${path.basename(filePath)}`);
  }
}

if (require.main === module) {
  updateAllJsonFiles().then(() => console.log('🎉 Done!'));
}

