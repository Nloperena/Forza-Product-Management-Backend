import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';

// Exact mapping from user's list
const INDUSTRIAL_IMAGE_MAPPING: Record<string, string> = {
  '81-0389': '81-0389 5 gal pail.png',
  'C130': 'C130 Drum.png',
  'C150': 'C150 1 gal pail.png',
  'C331': 'C331 5 gal Pail.png',
  'CA1000': 'CA1000 Container.png',
  'CA1500': 'CA1500 Container.png',
  'CA2400': 'CA2400 Container.png',
  'FRP': 'FRP 3.5 gal pail.png',
  'IC932': 'IC932 Canister.png',
  'IC933': 'IC933 Canister and Aerosol.png',
  'IC934': 'IC934 Canister and Aerosol.png',
  'IC946': 'IC946 Canister and Aerosol.png',
  'IC947': 'IC947 Canister.png',
  'OA12': 'OA12 Cartridge.png',
  'OA13': 'OA13 Cartridge.png',
  'OA4': 'OA4 Cartridge.png',
  'OA23': 'OA23 Sausage.png',
  'OS2': 'OS2 Cartridge.png',
  'OS10': 'OS10 Cartridge.png',
  'OS20': 'OS20 Sausage.png',
  'OS24': 'OS24 Cartridge.png',
  'OS25': 'OS25 Cartridge.png',
  'OS31': 'OS31 Cartridge.png',
  'OS35': 'OS35 Cartridge.png',
  'OS37': 'OS37 Cartridge.png',
  'OS61': 'OS61 Cartridge.png',
  'OSA': 'OSA tin can.png',
  'R160': 'R160 2 part.png',
  'R221': 'R221 2 part.png',
  'R519': 'R519 2 part.png',
  'S228': 'S228 1 gal pail.png',
};

const VERCEL_BLOB_BASE_URL = 'https://jw4to4yw6mmciodr.public.blob.vercel-storage.com';
const INDUSTRY_FOLDER = 'Industrial';

class ProductionImageUpdater {
  private productModel: ProductModel | null = null;
  private updatedCount: number = 0;
  private errors: Array<{productId: string, error: string}> = [];

  async updateProduction(): Promise<void> {
    try {
      console.log('🔧 Updating production database image URLs...\n');
      
      // Check if we're connected to production
      const isHeroku = !!process.env.DATABASE_URL && process.env.DATABASE_URL.includes('amazonaws.com');
      if (!isHeroku) {
        console.log('⚠️  WARNING: DATABASE_URL does not appear to be Heroku/Production');
        console.log('   Set DATABASE_URL to your Heroku Postgres URL to update production\n');
      } else {
        console.log('🌐 Detected Heroku/Production database\n');
      }
      
      // Connect to database
      console.log('🔌 Connecting to database...');
      await databaseService.connect();
      await databaseService.initializeDatabase();
      this.productModel = databaseService.isPostgres()
        ? new ProductModel()
        : new ProductModel(databaseService.getDatabase());
      console.log('✅ Database connected\n');
      
      // Update each product
      console.log('💾 Updating products...\n');
      for (const [productId, filename] of Object.entries(INDUSTRIAL_IMAGE_MAPPING)) {
        const expectedUrl = `${VERCEL_BLOB_BASE_URL}/product-images/${INDUSTRY_FOLDER}/${filename}`;
        await this.updateProduct(productId, expectedUrl);
      }
      
      // Print summary
      console.log('\n' + '='.repeat(80));
      console.log('📊 UPDATE SUMMARY');
      console.log('='.repeat(80));
      console.log(`✅ Updated: ${this.updatedCount} products`);
      if (this.errors.length > 0) {
        console.log(`❌ Errors: ${this.errors.length} products`);
        this.errors.forEach(e => {
          console.log(`   - ${e.productId}: ${e.error}`);
        });
      }
      console.log(`📋 Total in mapping: ${Object.keys(INDUSTRIAL_IMAGE_MAPPING).length}`);
      
    } catch (error) {
      console.error('❌ Error updating production:', error);
      throw error;
    } finally {
      if (databaseService.isPostgres()) {
        const pool = (databaseService as any).pool;
        if (pool) await pool.end();
      }
    }
  }

  private async updateProduct(productId: string, expectedUrl: string): Promise<void> {
    if (!this.productModel) return;

    try {
      const product = await this.productModel.getProductById(productId);
      if (!product) {
        console.log(`⚠️  ${productId}: Not found in database`);
        return;
      }

      const oldUrl = product.image || '(no image)';
      
      if (product.image !== expectedUrl) {
        await this.productModel.updateProduct(product.id, {
          image: expectedUrl
        });
        this.updatedCount++;
        console.log(`✅ ${productId}:`);
        console.log(`   Old: ${oldUrl}`);
        console.log(`   New: ${expectedUrl}\n`);
      } else {
        console.log(`✓ ${productId}: Already correct (${expectedUrl})\n`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.errors.push({ productId, error: errorMsg });
      console.error(`❌ ${productId}: ${errorMsg}\n`);
    }
  }
}

// Run updater
if (require.main === module) {
  const updater = new ProductionImageUpdater();
  updater.updateProduction()
    .then(() => {
      console.log('🎉 Update completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Update failed:', error);
      process.exit(1);
    });
}

export { ProductionImageUpdater };

