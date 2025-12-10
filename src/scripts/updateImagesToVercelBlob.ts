import { ProductModel, Product } from '../models/Product';
import { databaseService } from '../services/database';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script to update product images from local paths to Vercel Blob URLs
 * Maps: /images/Product-Mockups/[Industry]/[filename] 
 *   To: https://[blob-domain]/product-images/[Industry]/[filename]
 */

interface IndustryMapping {
  folderName: string;
  dbValue: string;
}

const INDUSTRY_MAPPINGS: IndustryMapping[] = [
  { folderName: 'Transportation', dbValue: 'transportation_industry' },
  { folderName: 'Marine', dbValue: 'marine_industry' },
  { folderName: 'Industrial', dbValue: 'industrial_industry' },
  { folderName: 'Construction', dbValue: 'construction_industry' },
  { folderName: 'Composites', dbValue: 'composites_industry' },
  { folderName: 'Insulation', dbValue: 'insulation_industry' },
];

// Vercel Blob base URL - update this with your actual blob domain
const VERCEL_BLOB_BASE_URL = process.env.VERCEL_BLOB_BASE_URL || 'https://jw4to4yw6mmciodr.public.blob.vercel-storage.com';

class VercelBlobImageUpdater {
  private productModel: ProductModel;
  private dryRun: boolean;
  private updatedCount: number = 0;
  private skippedCount: number = 0;
  private errorCount: number = 0;

  constructor(dryRun: boolean = true) {
    this.dryRun = dryRun;
    
    if (databaseService.isPostgres()) {
      this.productModel = new ProductModel();
    } else {
      this.productModel = new ProductModel(databaseService.getDatabase());
    }
  }

  /**
   * Convert local path to Vercel Blob URL
   * /images/Product-Mockups/Transportation/T-T1200 Tape.png
   * -> https://[blob]/product-images/Transportation/T-T1200 Tape.png
   */
  private convertToVercelBlobUrl(localPath: string): string | null {
    if (!localPath || !localPath.startsWith('/images/Product-Mockups/')) {
      return null;
    }

    // Remove /images/Product-Mockups/ prefix
    const relativePath = localPath.replace('/images/Product-Mockups/', '');
    
    // Construct Vercel Blob URL
    const blobUrl = `${VERCEL_BLOB_BASE_URL}/product-images/${relativePath}`;
    
    return blobUrl;
  }

  /**
   * Get industry folder name from database value
   */
  private getIndustryFolderName(dbValue: string): string {
    const mapping = INDUSTRY_MAPPINGS.find(m => m.dbValue === dbValue);
    return mapping ? mapping.folderName : dbValue.replace('_industry', '');
  }

  /**
   * Update all products with local paths to Vercel Blob URLs
   */
  async updateAllProducts(): Promise<void> {
    console.log('🔄 Updating product images to Vercel Blob URLs...');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE UPDATE'}`);
    console.log(`Vercel Blob Base URL: ${VERCEL_BLOB_BASE_URL}`);
    console.log('='.repeat(80));

    try {
      const allProducts = await this.productModel.getAllProducts();
      console.log(`\n📦 Found ${allProducts.length} products in database\n`);

      for (const product of allProducts) {
        if (!product.image) {
          this.skippedCount++;
          continue;
        }

        // Skip if already a Vercel Blob URL or external URL
        if (product.image.startsWith('http://') || product.image.startsWith('https://')) {
          // Check if it's already a Vercel Blob URL
          if (product.image.includes('blob.vercel-storage.com')) {
            this.skippedCount++;
            continue;
          }
          // Skip other external URLs
          this.skippedCount++;
          continue;
        }

        // Only process local paths that match our structure
        if (!product.image.startsWith('/images/Product-Mockups/')) {
          this.skippedCount++;
          continue;
        }

        // Convert to Vercel Blob URL
        const blobUrl = this.convertToVercelBlobUrl(product.image);
        
        if (!blobUrl) {
          console.log(`⚠️  Could not convert: ${product.product_id} - ${product.image}`);
          this.errorCount++;
          continue;
        }

        if (!this.dryRun) {
          try {
            await this.productModel.updateProduct(product.id, {
              image: blobUrl,
            });
            console.log(`✅ ${product.product_id} -> ${blobUrl}`);
            this.updatedCount++;
          } catch (error) {
            console.error(`❌ Error updating ${product.product_id}:`, error);
            this.errorCount++;
          }
        } else {
          console.log(`[DRY RUN] ${product.product_id}`);
          console.log(`  Current: ${product.image}`);
          console.log(`  New:     ${blobUrl}`);
          this.updatedCount++;
        }
      }

      // Summary
      console.log('\n' + '='.repeat(80));
      console.log('📊 UPDATE SUMMARY');
      console.log('='.repeat(80));
      console.log(`✅ Updated: ${this.updatedCount}`);
      console.log(`⏭️  Skipped: ${this.skippedCount}`);
      console.log(`❌ Errors: ${this.errorCount}`);
      
      if (this.dryRun) {
        console.log('\n💡 To apply changes, run with --live flag');
      }

    } catch (error) {
      console.error('\n❌ Error during update:', error);
      throw error;
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--live');

  try {
    await databaseService.connect();
    await databaseService.initializeDatabase();

    const updater = new VercelBlobImageUpdater(dryRun);
    await updater.updateAllProducts();

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { VercelBlobImageUpdater };
