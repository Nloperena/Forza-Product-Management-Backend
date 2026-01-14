import * as fs from 'fs';
import * as path from 'path';

const CSV_FILE_PATH = 'c:/Users/NicoL/Downloads/Prod Attr for Website DB Jan 1 2025(Nico! Use This Tab! ) (2).csv';
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

function formatList(text: string): string[] {
  if (!text || text.toLowerCase() === 'already on new site' || text === '???') return [];
  return text
    .split(/[\n*•]/)
    .map(s => s.trim())
    .map(s => s.replace(/^[?\uFFFD\u00A0\-\s]+/, ''))
    .filter(s => s.length > 0);
}

function getNewImageUrl(productId: string, fileName: string, industry: string): string {
  let folder = 'Marine';
  if (industry === 'composites_industry' || productId.startsWith('TAC-')) folder = 'Composites';
  else if (industry === 'marine_industry' || productId.startsWith('M-')) folder = 'Marine';
  return `${VERCEL_BLOB_BASE_URL}/${folder}/${fileName}`;
}

async function run() {
  try {
    if (!fs.existsSync(CSV_FILE_PATH)) {
      console.error(`❌ CSV not found: ${CSV_FILE_PATH}`);
      return;
    }

    const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < csvContent.length; i++) {
      const char = csvContent[i];
      const nextChar = csvContent[i+1];
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' && !inQuotes) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\r' && !inQuotes) {
      } else {
        currentField += char;
      }
    }
    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      rows.push(currentRow);
    }

    const marineProductsFromCSV: Record<string, any> = {};
    for (let i = 1; i < rows.length; i++) {
      const parts = rows[i];
      if (parts[2] === 'Marine') {
        const productId = parts[4];
        if (!productId) continue;
        marineProductsFromCSV[productId] = {
          name: parts[5],
          chemistry: parts[6],
          applications: formatList(parts[7]),
          benefits: formatList(parts[8]),
          sizing: formatList(parts[9]),
          color: parts[10],
          cleanup: parts[11],
          recommended_equipment: parts[12]
        };
      }
    }

    for (const jsonPath of JSON_FILE_PATHS) {
      if (!fs.existsSync(jsonPath)) {
        console.log(`⚠️  JSON not found: ${jsonPath}`);
        continue;
      }

      console.log(`📄 Processing ${path.basename(jsonPath)}...`);
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      let updateCount = 0;

      const updateProduct = (product: any) => {
        const csvData = marineProductsFromCSV[product.product_id];
        if (csvData) {
          product.name = `${product.product_id} - ${csvData.name}`;
          product.chemistry = csvData.chemistry;
          product.applications = csvData.applications;
          if (csvData.benefits.length > 0) product.benefits = csvData.benefits;
          product.sizing = csvData.sizing;
          product.color = csvData.color;
          product.cleanup = csvData.cleanup;
          product.recommended_equipment = csvData.recommended_equipment;
          product.last_edited = new Date().toISOString();
          updateCount++;
        }

        const fileName = MARINE_COMPOSITE_IMAGE_MAPPING[product.product_id];
        if (fileName) {
          product.image = getNewImageUrl(product.product_id, fileName, product.industry);
          if (!csvData) updateCount++; // Only increment if not already counted
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
        fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
        console.log(`🎉 Updated ${updateCount} Marine/Composite products in ${path.basename(jsonPath)}`);
      }
    }
  } catch (e) {
    console.error('❌ Error:', e);
  }
}

run();









