import * as fs from 'fs';
import * as path from 'path';
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

class IndustrialImageForceUpdater {
  private jsonFilePath: string;
  private productModel: ProductModel | null = null;
  private jsonUpdatedCount: number = 0;
  private dbUpdatedCount: number = 0;

  constructor() {
    this.jsonFilePath = path.join(__dirname, '../../data/forza_products_organized.json');
  }

  /**
   * Recursively find and update products in JSON
   */
  private updateProductsInObject(obj: any): void {
    if (Array.isArray(obj)) {
      obj.forEach(item => this.updateProductsInObject(item));
    } else if (obj && typeof obj === 'object') {
      // Check if this is a product object with industrial_industry
      if (obj.product_id && obj.industry === 'industrial_industry') {
        const productId = obj.product_id;
        const expectedFilename = INDUSTRIAL_IMAGE_MAPPING[productId];
        
        if (expectedFilename) {
          const expectedUrl = `${VERCEL_BLOB_BASE_URL}/product-images/${INDUSTRY_FOLDER}/${expectedFilename}`;
          const oldUrl = obj.image || '(no image)';
          
          // Force update regardless of current value
          obj.image = expectedUrl;
          this.jsonUpdatedCount++;
          
          if (oldUrl !== expectedUrl) {
            console.log(`✅ JSON: ${productId}`);
            console.log(`   Old: ${oldUrl}`);
            console.log(`   New: ${expectedUrl}`);
          } else {
            console.log(`✓ JSON: ${productId} - already correct`);
          }
        }
      }
      
      // Recursively process all properties
      Object.keys(obj).forEach(key => {
        this.updateProductsInObject(obj[key]);
      });
    }
  }

  /**
   * Update database
   */
  private async updateDatabaseImage(productId: string, expectedUrl: string): Promise<void> {
    if (!this.productModel) return;

    try {
      const product = await this.productModel.getProductById(productId);
      if (product) {
        const oldUrl = product.image || '(no image)';
        if (product.image !== expectedUrl) {
          await this.productModel.updateProduct(product.id, {
            image: expectedUrl
          });
          this.dbUpdatedCount++;
          console.log(`   💾 DB: ${productId}`);
          console.log(`      Old: ${oldUrl}`);
          console.log(`      New: ${expectedUrl}`);
        } else {
          console.log(`   ✓ DB: ${productId} - already correct`);
        }
      } else {
        console.log(`   ⚠️  DB: ${productId} - not found in database`);
      }
    } catch (error) {
      console.error(`   ❌ DB Error for ${productId}:`, error);
    }
  }

  async forceUpdate(): Promise<void> {
    try {
      console.log('🔧 Force updating industrial product images...\n');
      console.log(`📁 Reading JSON file: ${this.jsonFilePath}`);
      
      // Read JSON
      const jsonContent = fs.readFileSync(this.jsonFilePath, 'utf-8');
      const data = JSON.parse(jsonContent);
      
      // Update JSON
      console.log('\n📝 Updating JSON file...\n');
      this.updateProductsInObject(data);
      
      // Write JSON back
      console.log(`\n💾 Writing updated JSON to file...`);
      fs.writeFileSync(
        this.jsonFilePath,
        JSON.stringify(data, null, 2),
        'utf-8'
      );
      
      // Connect to database
      console.log('\n🔌 Connecting to database...');
      const isHeroku = !!process.env.DATABASE_URL && process.env.DATABASE_URL.includes('amazonaws.com');
      if (isHeroku) {
        console.log('🌐 Detected Heroku/Production database');
      }
      await databaseService.connect();
      await databaseService.initializeDatabase();
      this.productModel = databaseService.isPostgres()
        ? new ProductModel()
        : new ProductModel(databaseService.getDatabase());
      console.log('✅ Database connected\n');
      
      // Update database
      console.log('💾 Updating database...\n');
      for (const [productId, filename] of Object.entries(INDUSTRIAL_IMAGE_MAPPING)) {
        const expectedUrl = `${VERCEL_BLOB_BASE_URL}/product-images/${INDUSTRY_FOLDER}/${filename}`;
        await this.updateDatabaseImage(productId, expectedUrl);
      }
      
      console.log('\n' + '='.repeat(80));
      console.log('📊 UPDATE SUMMARY');
      console.log('='.repeat(80));
      console.log(`✅ JSON: Updated ${this.jsonUpdatedCount} products`);
      console.log(`✅ Database: Updated ${this.dbUpdatedCount} products`);
      console.log(`📋 Total products in mapping: ${Object.keys(INDUSTRIAL_IMAGE_MAPPING).length}`);
      
    } catch (error) {
      console.error('❌ Error force updating images:', error);
      throw error;
    } finally {
      if (databaseService.isPostgres()) {
        const pool = (databaseService as any).pool;
        if (pool) await pool.end();
      }
    }
  }
}

// Run updater
if (require.main === module) {
  const updater = new IndustrialImageForceUpdater();
  updater.forceUpdate()
    .then(() => {
      console.log('\n🎉 Force update completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Force update failed:', error);
      process.exit(1);
    });
}

export { IndustrialImageForceUpdater };

