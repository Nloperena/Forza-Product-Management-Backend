import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';
import * as dotenv from 'dotenv';

dotenv.config();

// Vercel Blob base URL
const VERCEL_BLOB_BASE_URL = 'https://jw4to4yw6mmciodr.public.blob.vercel-storage.com';

// Industry folder mapping
const INDUSTRY_FOLDER_MAP: { [key: string]: string } = {
  'industrial_industry': 'Industrial',
  'construction_industry': 'Construction',
  'marine_industry': 'Marine',
  'transportation_industry': 'Transportation',
  'composites_industry': 'Composites',
  'insulation_industry': 'Insulation',
};

class VercelBlobImageRestorer {
  private productModel: ProductModel;

  constructor() {
    if (databaseService.isPostgres()) {
      this.productModel = new ProductModel();
    } else {
      this.productModel = new ProductModel(databaseService.getDatabase());
    }
  }

  /**
   * Convert relative path to Vercel Blob URL
   * Examples:
   * - /product-images/81-0389.png -> https://jw4to4yw6mmciodr.public.blob.vercel-storage.com/product-images/Industrial/81-0389.png
   * - product-images/C-T731 Tape.png -> https://jw4to4yw6mmciodr.public.blob.vercel-storage.com/product-images/Construction/C-T731 Tape.png
   */
  private convertToVercelBlobUrl(imagePath: string, industry: string): string {
    // If already a full URL (Vercel Blob or external), return as-is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    // Remove leading slash and product-images/ prefix if present
    let filename = imagePath.replace(/^\/?product-images\//, '').replace(/^\//, '');
    
    // Get industry folder name
    const industryFolder = INDUSTRY_FOLDER_MAP[industry] || 'Industrial';
    
    // Construct Vercel Blob URL
    return `${VERCEL_BLOB_BASE_URL}/product-images/${industryFolder}/${filename}`;
  }

  async restoreImageUrls(): Promise<void> {
    console.log('🖼️  Restoring Vercel Blob image URLs...');
    console.log(`Vercel Blob Base URL: ${VERCEL_BLOB_BASE_URL}\n`);

    try {
      const products = await this.productModel.getAllProducts();
      console.log(`Found ${products.length} products to check\n`);

      let updatedCount = 0;
      let skippedCount = 0;
      const errors: Array<{ productId: string; error: string }> = [];

      for (const product of products) {
        try {
          // Skip if no image or already a full URL
          if (!product.image || product.image.startsWith('http://') || product.image.startsWith('https://')) {
            if (product.image && (product.image.startsWith('http://') || product.image.startsWith('https://'))) {
              skippedCount++;
              console.log(`⏭️  Skipped ${product.product_id}: Already has full URL`);
            }
            continue;
          }

          // Skip placeholder images
          if (product.image.includes('placeholder')) {
            skippedCount++;
            continue;
          }

          const newImageUrl = this.convertToVercelBlobUrl(product.image, product.industry);
          
          // Update product
          await this.productModel.updateProduct(product.product_id, {
            image: newImageUrl
          });

          updatedCount++;
          console.log(`✅ Updated ${product.product_id}: "${product.image}" -> "${newImageUrl}"`);

        } catch (error: any) {
          errors.push({
            productId: product.product_id,
            error: error.message || 'Unknown error'
          });
          console.error(`❌ Error updating ${product.product_id}:`, error.message);
        }
      }

      console.log(`\n📊 Summary:`);
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

    const restorer = new VercelBlobImageRestorer();
    await restorer.restoreImageUrls();

    console.log('\n✅ Image URL restoration completed!');
  } catch (error) {
    console.error('❌ Failed to restore image URLs:', error);
    process.exit(1);
  } finally {
    await databaseService.disconnect();
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

export { VercelBlobImageRestorer };

