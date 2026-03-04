/**
 * Merges RuggedRed products from ruggedred_import.json into forza_products_organized.json.
 * Adds rugged_red brand with household_industry and industrial_industry sections.
 * Run: npm run merge-ruggedred
 */
import fs from 'fs';
import path from 'path';

const RUGGEDRED_IMPORT_PATH = path.join(__dirname, '../../data/ruggedred_import.json');
const JSON_PATHS = [
  path.join(__dirname, '../../data/forza_products_organized.json'),
  path.join(__dirname, '../../../backend/backend/data/forza_products_organized.json'),
  path.join(__dirname, '../../../data/forza_products_organized.json'),
];
const LOCAL_RUGGEDRED_IMAGE_DIR = path.join(__dirname, '../../public/uploads/product-images/ruggedred');

interface ProductInput {
  product_id: string;
  name: string;
  full_name?: string;
  description?: string;
  brand: string;
  industry: string;
  chemistry?: string;
  url?: string;
  image?: string;
  benefits?: string[];
  applications?: string[];
  how_to_use?: string[];
  technical?: Array<{ property: string; value: string; unit?: string }>;
  sizing?: string[];
  published?: boolean;
}

function sanitizeProductId(productId: string): string {
  return (productId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function toCanonicalRuggedRedImage(productId: string, currentImage?: string): string {
  if (
    currentImage &&
    currentImage.startsWith('/product-images/ruggedred/') &&
    currentImage.endsWith('.webp')
  ) {
    return currentImage;
  }

  const safeId = sanitizeProductId(productId);
  const fileName = `${safeId}.webp`;
  const localImagePath = path.join(LOCAL_RUGGEDRED_IMAGE_DIR, fileName);
  if (fs.existsSync(localImagePath)) {
    return `/product-images/ruggedred/${fileName}`;
  }

  return currentImage || '';
}

function ensureRuggedRedBrand(data: any): void {
  const root = data.forza_products_organized;
  if (!root.rugged_red) {
    root.rugged_red = {
      description: 'Professional-grade, USA-made cleaning products for homes and businesses',
      products: {
        household_industry: {
          description: 'Household cleaning products',
          products: [],
        },
        industrial_industry: {
          description: 'Industrial cleaning products',
          products: [],
        },
      },
    };
  }
}

function toJsonProduct(p: ProductInput): Record<string, unknown> {
  return {
    product_id: p.product_id,
    name: p.name,
    full_name: p.full_name || p.name,
    description: p.description || '',
    brand: p.brand,
    industry: p.industry,
    chemistry: p.chemistry || '',
    url: p.url || '',
    image: toCanonicalRuggedRedImage(p.product_id, p.image),
    benefits: p.benefits || [],
    applications: p.applications || [],
    how_to_use: p.how_to_use || [],
    technical: p.technical || [],
    sizing: p.sizing || [],
    published: p.published !== false,
    last_edited: new Date().toISOString(),
  };
}

function main(): void {
  if (!fs.existsSync(RUGGEDRED_IMPORT_PATH)) {
    console.error('ruggedred_import.json not found at', RUGGEDRED_IMPORT_PATH);
    process.exit(1);
  }

  const ruggedredProducts: ProductInput[] = JSON.parse(
    fs.readFileSync(RUGGEDRED_IMPORT_PATH, 'utf8')
  ).filter((p: ProductInput) => p.brand === 'rugged_red');

  if (ruggedredProducts.length === 0) {
    console.log('No RuggedRed products found in ruggedred_import.json');
    return;
  }

  let totalWritten = 0;
  for (const jsonPath of JSON_PATHS) {
    const fullPath = path.resolve(process.cwd(), jsonPath);
    if (!fs.existsSync(fullPath)) {
      console.log('Skip (not found):', fullPath);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    ensureRuggedRedBrand(data);

    const householdProducts = ruggedredProducts
      .filter((p) => p.industry === 'household_industry')
      .map((p) => toJsonProduct(p));
    const industrialProducts = ruggedredProducts
      .filter((p) => p.industry === 'industrial_industry')
      .map((p) => toJsonProduct(p));

    // Sync RuggedRed fully from import file so stale placeholders are removed.
    data.forza_products_organized.rugged_red.products.household_industry.products = householdProducts;
    data.forza_products_organized.rugged_red.products.industrial_industry.products = industrialProducts;
    totalWritten += householdProducts.length + industrialProducts.length;

    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
    console.log('Updated:', fullPath, `(${householdProducts.length + industrialProducts.length} products synced)`);
  }

  console.log(`Synced ${totalWritten} RuggedRed product entries into JSON files`);
}

main();
