import { ProductModel } from '../models/Product';
import { databaseService } from '../services/database';

const VERCEL_BLOB_BASE_URL = 'https://jw4to4yw6mmciodr.public.blob.vercel-storage.com';
const PRODUCT_IMAGES_PREFIX = '/product-images';

// Product ID to image filename mapping
// Based on Vercel Blob structure: /product-images/[Industry]/[filename]
// Map product_id (as stored in DB) to image filename
const PRODUCT_IMAGE_MAP: Record<string, { filename: string; industry: string }> = {
  // Construction products
  'C-T5530': { filename: 'C-T5530 Tape.png', industry: 'Construction' },
  'C-T553': { filename: 'C-T553 Tape.png', industry: 'Construction' },
  'C-T557': { filename: 'C-T557 Tape.png', industry: 'Construction' },
  'C-T731': { filename: 'C-T731 Tape.png', industry: 'Construction' },
  'C-W6106': { filename: 'C-W6106 (Tote).png', industry: 'Construction' },
  
  // Composites products - TAC850 is stored as "TAC850" in DB, maps to TAC850GR image
  'TAC850': { filename: 'TAC850GR 22L.png', industry: 'Composites' },
  'TAC-734G': { filename: 'TAC-734G Canister and Aerosol.png', industry: 'Composites' },
  
  // Transportation products
  'TC467': { filename: 'TC467_22L_CanisterV2.png', industry: 'Transportation' },
};

interface UpdateResult {
  productId: string;
  productName: string;
  oldImage: string;
  newImage: string;
  status: 'updated' | 'not_found' | 'error';
  errorMessage?: string;
}

class SpecificProductImageUpdater {
  private productModel!: ProductModel;
  private dryRun: boolean;
  private results: UpdateResult[] = [];

  constructor(dryRun: boolean = true) {
    this.dryRun = dryRun;
  }

  private async initializeProductModel(): Promise<void> {
    if (databaseService.isPostgres()) {
      this.productModel = new ProductModel();
    } else {
      const db = databaseService.getDatabase();
      if (!db) {
        throw new Error('Database not initialized');
      }
      this.productModel = new ProductModel(db);
    }
  }

  private constructVercelBlobUrl(filename: string, industry: string): string {
    // Format: https://jw4to4yw6mmciodr.public.blob.vercel-storage.com/product-images/[Industry]/[filename]
    return `${VERCEL_BLOB_BASE_URL}${PRODUCT_IMAGES_PREFIX}/${industry}/${filename}`;
  }

  async execute(): Promise<void> {
    console.log('🔄 Updating specific product images to Vercel Blob URLs...');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE UPDATE'}`);
    console.log(`Vercel Blob Base URL: ${VERCEL_BLOB_BASE_URL}`);
    console.log('================================================================================');

    await databaseService.connect();
    await databaseService.initializeDatabase();
    await this.initializeProductModel();

    const allProducts = await this.productModel.getAllProducts();
    console.log(`\n📦 Found ${allProducts.length} products in database`);

    // Track which products we've already updated to avoid duplicates
    const updatedProductIds = new Set<string>();

    for (const [productId, imageInfo] of Object.entries(PRODUCT_IMAGE_MAP)) {
      // Try to find product by product_id (exact match first, then case-insensitive)
      let product = allProducts.find(
        p => p.product_id === productId
      );

      // If not found, try case-insensitive match
      if (!product) {
        product = allProducts.find(
          p => p.product_id?.toUpperCase() === productId.toUpperCase()
        );
      }

      // If still not found, try normalized match (remove dashes)
      if (!product) {
        const normalizedSearchId = productId.toUpperCase().replace(/-/g, '');
        product = allProducts.find(
          p => {
            const pId = p.product_id?.toUpperCase() || '';
            const normalizedPId = pId.replace(/-/g, '');
            return normalizedPId === normalizedSearchId;
          }
        );
      }

      if (!product) {
        console.log(`❌ Product "${productId}" not found in database`);
        this.results.push({
          productId,
          productName: 'N/A',
          oldImage: 'N/A',
          newImage: this.constructVercelBlobUrl(imageInfo.filename, imageInfo.industry),
          status: 'not_found',
        });
        continue;
      }

      // Skip if we've already updated this product
      const productKey = product.id.toString();
      if (updatedProductIds.has(productKey)) {
        console.log(`⏭️  Skipping "${productId}" - already processed`);
        continue;
      }
      updatedProductIds.add(productKey);

      console.log(`\n📦 Found: ${product.product_id} - ${product.full_name || product.name}`);

      const newImageUrl = this.constructVercelBlobUrl(imageInfo.filename, imageInfo.industry);

      this.results.push({
        productId: product.product_id || product.id,
        productName: product.full_name || product.name,
        oldImage: product.image || 'N/A',
        newImage: newImageUrl,
        status: 'updated',
      });

      if (!this.dryRun) {
        try {
          await this.productModel.updateProduct(product.id, { image: newImageUrl });
          console.log(`✅ ${product.product_id || product.name} -> ${newImageUrl}`);
        } catch (error: any) {
          console.error(`❌ Error updating ${product.product_id || product.name}:`, error.message);
          this.results[this.results.length - 1].status = 'error';
          this.results[this.results.length - 1].errorMessage = error.message;
        }
      } else {
        console.log(`[DRY RUN] ${product.product_id || product.name}`);
        console.log(`  Current: ${product.image || 'N/A'}`);
        console.log(`  New:     ${newImageUrl}`);
      }
    }

    console.log('\n================================================================================');
    console.log('📊 UPDATE SUMMARY');
    console.log('================================================================================');
    console.log(`✅ Updated: ${this.results.filter(r => r.status === 'updated').length}`);
    console.log(`❌ Not Found: ${this.results.filter(r => r.status === 'not_found').length}`);
    console.log(`⚠️  Errors: ${this.results.filter(r => r.status === 'error').length}`);

    if (this.dryRun) {
      console.log('\n💡 To apply changes, run with --live flag');
    } else {
      console.log('\n✅ All updates completed!');
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--live');

  try {
    const updater = new SpecificProductImageUpdater(dryRun);
    await updater.execute();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during product image update:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { SpecificProductImageUpdater };

