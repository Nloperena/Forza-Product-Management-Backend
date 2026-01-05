import * as fs from 'fs';
import * as path from 'path';

const CSV_FILE_PATH = 'c:/Users/NicoL/Downloads/Prod Attr for Website DB Jan 1 2025(Nico! Use This Tab! ) (2).csv';
const JSON_FILE_PATHS = [
  path.join(__dirname, '../../data/forza_products_organized.json'),
  path.join(__dirname, '../../backend-import.json')
];

function formatList(text: string): string[] {
  if (!text || text.toLowerCase() === 'already on new site' || text === '???') return [];
  return text
    .split(/[\n*•]/)
    .map(s => s.trim())
    .map(s => s.replace(/^[?\uFFFD\u00A0\-\s]+/, ''))
    .filter(s => s.length > 0);
}

function updateProductObject(product: any, csvData: any) {
  product.name = `${product.product_id} - ${csvData.name}`;
  product.chemistry = csvData.chemistry;
  product.applications = csvData.applications;
  if (csvData.benefits.length > 0) {
    product.benefits = csvData.benefits;
  }
  product.sizing = csvData.sizing;
  product.color = csvData.color;
  product.cleanup = csvData.cleanup;
  product.recommended_equipment = csvData.recommended_equipment;
  product.last_edited = new Date().toISOString();
}

async function run() {
  try {
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
      if (!fs.existsSync(jsonPath)) continue;
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      let updateCount = 0;
      if (jsonData.forza_products_organized) {
        const organized = jsonData.forza_products_organized;
        for (const brandKey of ['forza_bond', 'forza_seal', 'forza_tape']) {
          if (organized[brandKey] && organized[brandKey].products.marine_industry) {
            for (const product of organized[brandKey].products.marine_industry.products) {
              const csvData = marineProductsFromCSV[product.product_id];
              if (csvData) { updateProductObject(product, csvData); updateCount++; }
            }
          }
        }
      } else if (Array.isArray(jsonData)) {
        for (const product of jsonData) {
          if (product.industry === 'marine_industry') {
            const csvData = marineProductsFromCSV[product.product_id];
            if (csvData) { updateProductObject(product, csvData); updateCount++; }
          }
        }
      }
      if (updateCount > 0) {
        fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
        console.log(`🎉 Updated ${updateCount} Marine products in ${path.basename(jsonPath)}`);
      }
    }
  } catch (e) { console.error(e); }
}
run();
