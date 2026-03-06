/**
 * Export RuggedRed products into strict Contentful content-model payloads.
 * This keeps runtime JSON clean while making migration easy/repeatable.
 *
 * Inputs:
 *   - backend/data/forza_products_organized.json
 * Outputs:
 *   - backend/data/content-model-migration/cleaningProductData.entries.json
 *   - backend/data/content-model-migration/b2bCleaningProductData.entries.json
 *
 * Run:
 *   npm run export-ruggedred-content-models
 */
import fs from 'fs';
import path from 'path';

interface Product {
  product_id: string;
  name?: string;
  full_name?: string;
  description?: string;
  industry?: string;
  image?: string;
  url?: string;
  benefits?: string[];
  applications?: string[];
  how_to_use?: string[];
  sizing?: string[];
}

interface CleaningProductDataFields {
  productTitle: string;
  productHeroImage: string;
  price: number | null;
  buyNowButtonUrl: string;
  keyFeatures: string[];
  shortProductDescription: string;
  detailedProductDescription: string;
  keyBenefits: string[];
  productInUseImages: string[];
  slogan: string;
}

interface B2BCleaningProductDataFields extends CleaningProductDataFields {
  frontLabelCallOuts: string[];
  applications: string;
  howToUse: string;
  productMockupVariations: string[];
  bottleSizing: string;
}

const INPUT_JSON_PATH = path.join(__dirname, '../../data/forza_products_organized.json');
const OUTPUT_DIR = path.join(__dirname, '../../data/content-model-migration');

function readRuggedRedProducts(): Product[] {
  const data = JSON.parse(fs.readFileSync(INPUT_JSON_PATH, 'utf8'));
  const rr = data?.forza_products_organized?.rugged_red?.products;
  if (!rr) return [];

  const household = rr?.household_industry?.products || [];
  const industrial = rr?.industrial_industry?.products || [];
  return [...household, ...industrial];
}

function pickBottleSizing(sizing: string[] = []): string {
  const joined = sizing.join(' ').toLowerCase();
  if (joined.includes('32oz') && joined.includes('1gal')) return '32oz + 1gal Bottle';
  if (joined.includes('32oz')) return '32oz Bottle';
  if (joined.includes('1gal') || joined.includes('1 gallon')) return '1gal Bottle';
  return '';
}

function inferHowToUse(howToUse: string[] = [], benefits: string[] = []): string {
  const directSteps = howToUse.map((line) => String(line || '').trim()).filter(Boolean);
  if (directSteps.length) {
    return directSteps.join('\n');
  }

  const instructions = benefits.filter((line) =>
    /(spray|wipe|dilution|mix|let sit|apply|use)/i.test(line)
  );
  return instructions.join('\n');
}

function baseFields(product: Product): CleaningProductDataFields {
  const title = product.full_name || product.name || product.product_id;
  const benefits = product.benefits || [];
  const shortDesc = product.description || '';
  const detailed = product.applications?.join('\n') || shortDesc;
  return {
    productTitle: title,
    productHeroImage: product.image || '',
    price: null,
    buyNowButtonUrl: product.url || '',
    keyFeatures: benefits.slice(0, 6),
    shortProductDescription: shortDesc,
    detailedProductDescription: detailed,
    keyBenefits: benefits,
    productInUseImages: [],
    slogan: '',
  };
}

function toCleaningProductDataEntries(products: Product[]) {
  return products
    .filter((p) => p.industry === 'household_industry')
    .map((p) => ({
      product_id: p.product_id,
      fields: baseFields(p),
    }));
}

function toB2BEntries(products: Product[]) {
  return products
    .filter((p) => p.industry === 'industrial_industry')
    .map((p) => {
      const base = baseFields(p);
      const b2b: B2BCleaningProductDataFields = {
        ...base,
        frontLabelCallOuts: (p.benefits || []).slice(0, 5),
        applications: (p.applications || []).join('\n'),
        howToUse: inferHowToUse(p.how_to_use || [], p.benefits || []),
        productMockupVariations: [],
        bottleSizing: pickBottleSizing(p.sizing || []),
      };
      return {
        product_id: p.product_id,
        fields: b2b,
      };
    });
}

function main(): void {
  if (!fs.existsSync(INPUT_JSON_PATH)) {
    throw new Error(`Input file not found: ${INPUT_JSON_PATH}`);
  }
  const products = readRuggedRedProducts();
  if (!products.length) {
    console.log('No RuggedRed products found in current JSON.');
    return;
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const cleaningPayload = {
    contentTypeId: 'cleaningProductData',
    entries: toCleaningProductDataEntries(products),
  };
  const b2bPayload = {
    contentTypeId: 'b2bCleaningProductData',
    entries: toB2BEntries(products),
  };

  const cleaningOut = path.join(OUTPUT_DIR, 'cleaningProductData.entries.json');
  const b2bOut = path.join(OUTPUT_DIR, 'b2bCleaningProductData.entries.json');

  fs.writeFileSync(cleaningOut, JSON.stringify(cleaningPayload, null, 2), 'utf8');
  fs.writeFileSync(b2bOut, JSON.stringify(b2bPayload, null, 2), 'utf8');

  console.log(`Exported ${cleaningPayload.entries.length} cleaningProductData entries -> ${cleaningOut}`);
  console.log(`Exported ${b2bPayload.entries.length} b2bCleaningProductData entries -> ${b2bOut}`);
}

main();

