import * as fs from 'fs';
import * as path from 'path';

const JSON_FILE_PATH = path.join(__dirname, '../../data/forza_products_organized.json');

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

async function updateJsonInsulationImages() {
  if (!fs.existsSync(JSON_FILE_PATH)) {
    console.error(`❌ JSON not found at ${JSON_FILE_PATH}`);
    return;
  }

  console.log(`📄 Processing ${path.basename(JSON_FILE_PATH)}...`);
  const jsonData = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf-8'));
  let updateCount = 0;

  const processProduct = (product: any) => {
    const pid = product.product_id;
    if (MAPPING[pid] && product.industry === 'insulation_industry') {
      const newUrl = `${VERCEL_BASE}/Insulation/${MAPPING[pid]}`;
      if (product.image !== newUrl) {
        console.log(`✅ Updating ${pid}: ${product.image} -> ${newUrl}`);
        product.image = newUrl;
        updateCount++;
      }
    } else {
      // Also check for old image patterns
      for (const [targetPid, newFile] of Object.entries(MAPPING)) {
        if (product.image?.toLowerCase().includes(`/${targetPid.toLowerCase()}.png`) && 
            product.industry === 'insulation_industry') {
          const newUrl = `${VERCEL_BASE}/Insulation/${newFile}`;
          if (product.image !== newUrl) {
            console.log(`🔄 Updating shared image for ${pid}: ${product.image} -> ${newUrl}`);
            product.image = newUrl;
            updateCount++;
          }
          break;
        }
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
            industry.products.forEach(processProduct);
          }
        }
      }
    }
  }

  if (updateCount > 0) {
    fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(jsonData, null, 2), 'utf-8');
    console.log(`🎉 Updated ${updateCount} Insulation products in ${path.basename(JSON_FILE_PATH)}`);
  } else {
    console.log('ℹ️ No updates needed');
  }
}

if (require.main === module) {
  updateJsonInsulationImages().catch(console.error);
}

export { updateJsonInsulationImages };









