import fs from 'fs';
import path from 'path';

const IMAGE_DIR = path.join(__dirname, '../../public/uploads/product-images/ruggedred');
const RUGGEDRED_IMPORT_PATH = path.join(__dirname, '../../data/ruggedred_import.json');
const FORZA_JSON_PATH = path.join(__dirname, '../../data/forza_products_organized.json');
const CLEANING_EXPORT_PATH = path.join(
  __dirname,
  '../../data/content-model-migration/cleaningProductData.entries.json'
);
const B2B_EXPORT_PATH = path.join(
  __dirname,
  '../../data/content-model-migration/b2bCleaningProductData.entries.json'
);

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function sanitizeProductId(productId: string): string {
  return (productId || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getCanonicalImagePath(productId: string): string | null {
  const safeId = sanitizeProductId(productId);
  const fileName = `${safeId}.webp`;
  const filePath = path.join(IMAGE_DIR, fileName);
  if (!fs.existsSync(filePath)) return null;
  return `/product-images/ruggedred/${fileName}`;
}

function isRuggedRedRecord(record: { brand?: string; product_id?: string }): boolean {
  return record.brand === 'rugged_red' || (record.product_id || '').startsWith('rr_');
}

function updateRuggedRedImport(missing: Set<string>): number {
  const products = readJson<Array<{ product_id: string; brand?: string; image?: string }>>(RUGGEDRED_IMPORT_PATH);
  let updated = 0;

  for (const product of products) {
    if (!isRuggedRedRecord(product)) continue;
    const nextImage = getCanonicalImagePath(product.product_id);
    if (!nextImage) {
      missing.add(product.product_id);
      continue;
    }
    if (product.image !== nextImage) {
      product.image = nextImage;
      updated++;
    }
  }

  writeJson(RUGGEDRED_IMPORT_PATH, products);
  return updated;
}

function updateForzaRuggedRedSection(missing: Set<string>): number {
  const data = readJson<any>(FORZA_JSON_PATH);
  const root = data?.forza_products_organized?.rugged_red?.products;
  const household = Array.isArray(root?.household_industry?.products) ? root.household_industry.products : [];
  const industrial = Array.isArray(root?.industrial_industry?.products) ? root.industrial_industry.products : [];
  let updated = 0;

  for (const product of [...household, ...industrial]) {
    if (!product?.product_id) continue;
    const nextImage = getCanonicalImagePath(product.product_id);
    if (!nextImage) {
      missing.add(product.product_id);
      continue;
    }
    if (product.image !== nextImage) {
      product.image = nextImage;
      updated++;
    }
  }

  writeJson(FORZA_JSON_PATH, data);
  return updated;
}

function updateContentModelExport(filePath: string, missing: Set<string>): number {
  const payload = readJson<any>(filePath);
  const entries = Array.isArray(payload?.entries) ? payload.entries : [];
  let updated = 0;

  for (const entry of entries) {
    const productId = String(entry?.product_id || '');
    if (!productId.startsWith('rr_')) continue;
    const nextImage = getCanonicalImagePath(productId);
    if (!nextImage) {
      missing.add(productId);
      continue;
    }
    if (!entry.fields) entry.fields = {};
    if (entry.fields.productHeroImage !== nextImage) {
      entry.fields.productHeroImage = nextImage;
      updated++;
    }
  }

  writeJson(filePath, payload);
  return updated;
}

function main(): void {
  const missing = new Set<string>();

  const importUpdated = updateRuggedRedImport(missing);
  const forzaUpdated = updateForzaRuggedRedSection(missing);
  const cleaningUpdated = updateContentModelExport(CLEANING_EXPORT_PATH, missing);
  const b2bUpdated = updateContentModelExport(B2B_EXPORT_PATH, missing);

  console.log('RuggedRed WebP replacement complete.');
  console.log(`- ruggedred_import.json updated: ${importUpdated}`);
  console.log(`- forza_products_organized.json updated: ${forzaUpdated}`);
  console.log(`- cleaningProductData.entries.json updated: ${cleaningUpdated}`);
  console.log(`- b2bCleaningProductData.entries.json updated: ${b2bUpdated}`);

  if (missing.size > 0) {
    console.log('\nMissing local .webp files for these product_ids:');
    for (const productId of [...missing].sort()) {
      console.log(`- ${productId}`);
    }
  }
}

main();
