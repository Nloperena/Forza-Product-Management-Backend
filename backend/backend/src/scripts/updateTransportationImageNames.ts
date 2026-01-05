import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';
import * as dotenv from 'dotenv';

dotenv.config();

// Vercel Blob base URL
const VERCEL_BLOB_BASE_URL = 'https://jw4to4yw6mmciodr.public.blob.vercel-storage.com';

// Mapping of product IDs to actual Vercel Blob filenames
const TRANSPORTATION_IMAGE_MAP: { [productId: string]: string } = {
  'T-C222': 'T-C222 5 gal Pail.png',
  'T-C225': 'T-C225 5 gal Pail.png',
  'T-C485': 'T-C485 5 gal Pail.png',
  'T-OA152': 'T-OA152 Cartridge.png',
  'T-OA156': 'T-OA156 Cartridge.png',
  'T-OA177': 'T-OA177 Cartridge.png',
  'T-OS150': 'T-OS150 Cartridge.png',
  'T-OS151': 'T-OS151 Cartridge.png',
  'T-OS164': 'T-OS164 Sausage.png',
  'T-OSA155': 'T-OSA155 Tin Can.png',
  'T-R679': 'T-R679 2 Part.png',
  'T-R785': 'T-R785 2 Part.png',
  'T-S596': 'T-S596 5 gal Pail.png',
  'T-T1200': 'T-T1200 Tape.png',
  'T-T1420 (ext seal)': 'T-T1420 Tape.png',
  'T-T415': 'T-T415 Tape.png',
  'T-T420': 'T-T420 Tape.png',
  'T-T430': 'T-T430 Tape.png',
  'TC452': 'TC452 22L.png',
  'TC453': 'TC453 22L and Aerosol.png',
  'TC454': 'TC454 22L and Aerosol.png',
  'TC456': 'TC456 22L and Aerosol.png',
  'TC466': 'TC466 22L and Aerosol.png',
  'TC467': 'TC467_22L_CanisterV2.png',
};

class TransportationImageUpdater {
  private productModel: ProductModel;

  constructor() {
    if (databaseService.isPostgres()) {
      this.productModel = new ProductModel();
    } else {
      this.productModel = new ProductModel(databaseService.getDatabase());
    }
  }

  async updateTransportationImages(): Promise<void> {
    console.log('🚀 Updating Transportation product image URLs...\n');
    console.log(`Vercel Blob Base URL: ${VERCEL_BLOB_BASE_URL}\n`);
    console.log('='.repeat(80));

    try {
      const products = await this.productModel.getAllProducts();
      
      // Filter to only Transportation products
      const transportationProducts = products.filter(
        p => p.industry === 'transportation_industry'
      );

      console.log(`Found ${transportationProducts.length} Transportation products\n`);

      let updatedCount = 0;
      let skippedCount = 0;
      const errors: Array<{ productId: string; error: string }> = [];

      for (const product of transportationProducts) {
        try {
          const correctFilename = TRANSPORTATION_IMAGE_MAP[product.product_id];
          
          if (!correctFilename) {
            skippedCount++;
            console.log(`⏭️  Skipped ${product.product_id}: No mapping found`);
            continue;
          }

          const newImageUrl = `${VERCEL_BLOB_BASE_URL}/product-images/Transportation/${correctFilename}`;

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

    const updater = new TransportationImageUpdater();
    await updater.updateTransportationImages();

    console.log('\n✅ Transportation image update completed!');
  } catch (error) {
    console.error('❌ Failed to update Transportation images:', error);
    process.exit(1);
  } finally {
    await databaseService.disconnect();
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

export { TransportationImageUpdater };

