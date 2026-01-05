import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';
import * as dotenv from 'dotenv';

dotenv.config();

// Vercel Blob base URL
const VERCEL_BLOB_BASE_URL = 'https://jw4to4yw6mmciodr.public.blob.vercel-storage.com';

// Mapping of product IDs to actual Vercel Blob filenames
const CONSTRUCTION_IMAGE_MAP: { [productId: string]: string } = {
  'C-C360': 'C-C360 5 gal Pail.png',
  'C-C551': 'C-C551 5 gal Pail.png',
  'C-OA5': 'C-OA5 Cartridge.png',
  'C-OA52': 'C-OA52 Cartridge.png',
  'C-OA77': 'C-OA77 3.5 gal Pail.png',
  'C-OA98': 'C-OA98 Sausage.png',
  'C-OS55': 'C-OS55 Sausage.png',
  'C-OS9': 'C-OS9 Sausage.png',
  'C-OSA': 'C-OSA Tin Can.png',
  'C-R329': 'C-R329 2 Part.png',
  'C-R552': 'C-R552 2 Part.png',
  'C-R560': 'C-R560 2 Part.png',
  'C-S538': 'C-S538 Tin Can.png',
  'C-T500': 'C-T500 Tape.png',
  'C-T5100': 'C-T5100 Tape.png',
  'C-T550': 'C-T550 Tape.png',
  'C-T553': 'C-T553 Tape.png',
  'C-T5530': 'C-T5530 Tape.png',
  'C-T557': 'C-T557 Tape.png',
  'C-T564': 'C-T564 tape.png',
  'C-T731': 'C-T731 Tape.png',
  'C-W6106': 'C-W6106 (Tote).png',
  'CC501': 'CC501 22L and Aerosol.png',
  'CC503': 'CC503 Aerosol.png',
  'CC507': 'CC507 22L.png',
  'CC513': 'CC513 22L.png',
  'CC515': 'CC515 22L and Aerosol.png',
  'CC519': 'CC519 22L and Aerosol.png',
};

class ConstructionImageUpdater {
  private productModel: ProductModel;

  constructor() {
    if (databaseService.isPostgres()) {
      this.productModel = new ProductModel();
    } else {
      this.productModel = new ProductModel(databaseService.getDatabase());
    }
  }

  async updateConstructionImages(): Promise<void> {
    console.log('🚀 Updating Construction product image URLs...\n');
    console.log(`Vercel Blob Base URL: ${VERCEL_BLOB_BASE_URL}\n`);
    console.log('='.repeat(80));

    try {
      const products = await this.productModel.getAllProducts();
      
      // Filter to only Construction products
      const constructionProducts = products.filter(
        p => p.industry === 'construction_industry'
      );

      console.log(`Found ${constructionProducts.length} Construction products\n`);

      let updatedCount = 0;
      let skippedCount = 0;
      const errors: Array<{ productId: string; error: string }> = [];

      for (const product of constructionProducts) {
        try {
          const correctFilename = CONSTRUCTION_IMAGE_MAP[product.product_id];
          
          if (!correctFilename) {
            skippedCount++;
            console.log(`⏭️  Skipped ${product.product_id}: No mapping found`);
            continue;
          }

          const newImageUrl = `${VERCEL_BLOB_BASE_URL}/product-images/Construction/${correctFilename}`;

          // Check if already correct
          if (product.image === newImageUrl) {
            skippedCount++;
            console.log(`✅ ${product.product_id}: Already has correct URL`);
            continue;
          }

          // Update product
          await this.productModel.updateProduct(product.product_id, {
            image: newImageUrl
          });

          updatedCount++;
          console.log(`✅ Updated ${product.product_id}:`);
          console.log(`   Old: ${product.image || '(none)'}`);
          console.log(`   New: ${newImageUrl}`);

        } catch (error: any) {
          errors.push({
            productId: product.product_id,
            error: error.message || 'Unknown error'
          });
          console.error(`❌ Error updating ${product.product_id}:`, error.message);
        }
      }

      console.log(`\n${'='.repeat(80)}`);
      console.log('📊 SUMMARY');
      console.log('='.repeat(80));
      console.log(`✅ Updated: ${updatedCount} products`);
      console.log(`⏭️  Skipped: ${skippedCount} products`);
      console.log(`❌ Errors: ${errors.length} products`);

      if (errors.length > 0) {
        console.log(`\n❌ Errors:`);
        errors.forEach(e => console.log(`  - ${e.productId}: ${e.error}`));
      }

    } catch (error) {
      console.error('❌ Fatal error:', error);
      throw error;
    }
  }
}

async function main() {
  try {
    await databaseService.connect();
    await databaseService.initializeDatabase();

    const updater = new ConstructionImageUpdater();
    await updater.updateConstructionImages();

    console.log('\n✅ Construction image update completed!');
  } catch (error) {
    console.error('❌ Failed to update Construction images:', error);
    process.exit(1);
  } finally {
    await databaseService.disconnect();
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

export { ConstructionImageUpdater };

