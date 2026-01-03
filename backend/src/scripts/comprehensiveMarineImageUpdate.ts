import * as fs from 'fs';
import * as path from 'path';

const JSON_FILE_PATH = path.join(__dirname, '../../data/forza_products_organized.json');
const IMPORT_FILE_PATH = path.join(__dirname, '../../../backend-import.json'); // Adjusted for root level

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

async function updateJsonComprehensively() {
  const files = [JSON_FILE_PATH];
  
  for (const filePath of files) {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ File not found: ${filePath}`);
      continue;
    }

    console.log(`📄 Processing ${path.basename(filePath)}...`);
    const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    let updateCount = 0;

    const updateProduct = (product: any) => {
      if (product.industry === 'marine_industry' || product.industry === 'composites_industry') {
        // console.log(`🔎 Checking ${product.product_id} (${product.image})`);
      }
      // DEBUG: Log if we see one of the target old names
      if (product.image && (product.image.includes('m-c280.png') || product.image.includes('mc739.png'))) {
        console.log(`🔍 Found target image in ${product.product_id}: ${product.image}`);
      }

      // 1. Try exact match on Product ID
      if (MAPPING[product.product_id]) {
        const folder = product.product_id.startsWith('TAC-') ? 'Composites' : 'Marine';
        const newUrl = `${VERCEL_BASE}/${folder}/${MAPPING[product.product_id]}`;
        if (product.image !== newUrl) {
          console.log(`✅ Direct Update: ${product.product_id} -> ${MAPPING[product.product_id]}`);
          product.image = newUrl;
          updateCount++;
        }
        return;
      }

      // 2. Try to see if the current image URL "contains" a product that is in our mapping
      // This catches products like M-C283 that might be using m-c280.png
      for (const [pid, newFile] of Object.entries(MAPPING)) {
        const oldFilePattern = pid.toLowerCase() + '.png';
        const oldFilePattern2 = pid + '.png';
        
        if (product.image?.toLowerCase().endsWith('/' + oldFilePattern) || 
            product.image?.endsWith('/' + oldFilePattern2)) {
          
          const folder = pid.startsWith('TAC-') ? 'Composites' : 'Marine';
          const newUrl = `${VERCEL_BASE}/${folder}/${newFile}`;
          
          if (product.image !== newUrl) {
            console.log(`🔄 Updating shared image for ${product.product_id}: ${product.image} -> ${newFile}`);
            product.image = newUrl;
            updateCount++;
          }
          break;
        }
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
              industry.products.forEach(updateProduct);
            }
          }
        }
      }
    } else if (Array.isArray(jsonData)) {
      jsonData.forEach(updateProduct);
    }

    if (updateCount > 0) {
      fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), 'utf-8');
      console.log(`🎉 Updated ${updateCount} products in ${path.basename(filePath)}`);
    }
  }
}

updateJsonComprehensively().catch(console.error);

