import * as fs from 'fs';
import * as path from 'path';

const JSON_FILE_PATHS = [
  path.join(__dirname, '../../data/forza_products_organized.json'),
  path.join(__dirname, '../../backend-import.json')
];

const MARINE_COMPOSITE_IMAGE_MAPPING: Record<string, string> = {
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

const VERCEL_BLOB_BASE_URL = 'https://jw4to4yw6mmciodr.public.blob.vercel-storage.com/product-images';

function getNewImageUrl(productId: string, fileName: string, industry: string): string {
  let folder = 'Marine';
  if (industry === 'composites_industry') folder = 'Composites';
  else if (industry === 'marine_industry') folder = 'Marine';
  return `${VERCEL_BLOB_BASE_URL}/${folder}/${fileName}`;
}

async function updateImages() {
  for (const jsonPath of JSON_FILE_PATHS) {
    if (!fs.existsSync(jsonPath)) continue;
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    let updateCount = 0;
    const processProduct = (product: any) => {
      const fileName = MARINE_COMPOSITE_IMAGE_MAPPING[product.product_id];
      if (fileName) {
        product.image = getNewImageUrl(product.product_id, fileName, product.industry);
        updateCount++;
      }
    };
    if (jsonData.forza_products_organized) {
      const organized = jsonData.forza_products_organized;
      for (const brandKey in organized) {
        const brand = organized[brandKey];
        if (brand.products) {
          for (const industryKey in brand.products) {
            const industry = brand.products[industryKey];
            if (industry.products) {
              industry.products.forEach(processProduct);
            }
          }
        }
      }
    } else if (Array.isArray(jsonData)) {
      jsonData.forEach(processProduct);
    }
    if (updateCount > 0) {
      fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
      console.log(`🎉 Updated ${updateCount} image URLs in ${path.basename(jsonPath)}`);
    }
  }
}
updateImages().catch(console.error);
