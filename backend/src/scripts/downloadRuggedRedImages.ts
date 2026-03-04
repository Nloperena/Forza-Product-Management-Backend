/**
 * Downloads RuggedRed product images and converts to webp.
 * Reads from ruggedred_import.json or forza_products_organized.json (rugged_red brand).
 * Output: backend/public/uploads/product-images/ruggedred/*.webp
 * Run: npm run download-ruggedred-images
 */
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import sharp from 'sharp';

const RUGGEDRED_IMPORT_PATH = path.join(__dirname, '../../data/ruggedred_import.json');
const FORZA_JSON_PATH = path.join(__dirname, '../../data/forza_products_organized.json');
const OUTPUT_DIR = path.join(__dirname, '../../public/uploads/product-images/ruggedred');
const MANIFEST_PATH = path.join(__dirname, '../../data/ruggedred_webp_manifest.json');
const SHOULD_WRITE_MANIFEST = process.argv.includes('--manifest');

interface ProductInput {
  product_id: string;
  name: string;
  image?: string;
  brand?: string;
}

interface ManifestEntry {
  product_id: string;
  source_image: string;
  local_webp: string;
  success: boolean;
  error?: string;
}

function extractRuggedRedProducts(): ProductInput[] {
  if (fs.existsSync(RUGGEDRED_IMPORT_PATH)) {
    const data = JSON.parse(fs.readFileSync(RUGGEDRED_IMPORT_PATH, 'utf8'));
    return Array.isArray(data) ? data.filter((p: ProductInput) => !p.brand || p.brand === 'rugged_red') : [];
  }

  if (fs.existsSync(FORZA_JSON_PATH)) {
    const data = JSON.parse(fs.readFileSync(FORZA_JSON_PATH, 'utf8'));
    const root = data?.forza_products_organized?.rugged_red?.products;
    if (!root) return [];

    const products: ProductInput[] = [];
    for (const industry of ['household_industry', 'industrial_industry']) {
      const arr = root[industry]?.products;
      if (Array.isArray(arr)) products.push(...arr);
    }
    return products;
  }

  return [];
}

function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const protocol = parsed.protocol === 'https:' ? https : http;
    const req = protocol.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
  });
}

async function main(): Promise<void> {
  console.log('Loading RuggedRed products...');
  const products = extractRuggedRedProducts();
  const withImages = products.filter(p => p.image && p.image.startsWith('http'));
  console.log(`Found ${products.length} products, ${withImages.length} with image URLs`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let success = 0;
  let failed = 0;
  const manifest: ManifestEntry[] = [];

  for (const product of withImages) {
    const productId = (product.product_id || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
    const outPath = path.join(OUTPUT_DIR, `${productId}.webp`);

    try {
      const buffer = await downloadImage(product.image!);
      await sharp(buffer)
        .webp({ quality: 85 })
        .toFile(outPath);
      console.log(`OK: ${product.product_id} -> ${productId}.webp`);
      success++;
      manifest.push({
        product_id: product.product_id,
        source_image: product.image!,
        local_webp: `/product-images/ruggedred/${productId}.webp`,
        success: true,
      });
    } catch (err) {
      console.error(`FAIL: ${product.product_id} -`, err instanceof Error ? err.message : err);
      failed++;
      manifest.push({
        product_id: product.product_id,
        source_image: product.image!,
        local_webp: `/product-images/ruggedred/${productId}.webp`,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  console.log(`\nDone. Success: ${success}, Failed: ${failed}`);
  console.log(`Images saved to: ${OUTPUT_DIR}`);

  if (SHOULD_WRITE_MANIFEST) {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
    console.log(`Manifest written to: ${MANIFEST_PATH}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
