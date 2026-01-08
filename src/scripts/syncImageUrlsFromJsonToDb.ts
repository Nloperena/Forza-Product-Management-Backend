import * as fs from 'fs';
import * as path from 'path';
import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';

const JSON_FILE_PATH = path.join(__dirname, '../../data/forza_products_organized.json');

class ImageUrlSyncer {
  private productModel: ProductModel | null = null;
  private updatedCount: number = 0;
  private notFoundCount: number = 0;

  private findProductInJSON(productId: string, obj: any): any {
    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (item.product_id === productId) {
          return item;
        }
        const found = this.findProductInJSON(productId, item);
        if (found) return found;
      }
    } else if (obj && typeof obj === 'object') {
      if (obj.product_id === productId) {
        return obj;
      }
      for (const key in obj) {
        const found = this.findProductInJSON(productId, obj[key]);
        if (found) return found;
      }
    }
    return null;
  }

  async sync(): Promise<void> {
    try {
      console.log('🔄 Syncing image URLs from JSON to database...\n');

      // Load JSON
      console.log('📄 Loading JSON file...');
      const jsonContent = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
      const jsonData = JSON.parse(jsonContent);

      // Connect to database
      console.log('🔌 Connecting to database...');
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

      // Get all products from database
      const dbProducts = await this.productModel.getAllProducts();
      console.log(`📊 Found ${dbProducts.length} products in database\n`);

      // Sync each product
      for (const dbProduct of dbProducts) {
        if (!dbProduct.image) continue;

        // Find product in JSON
        const jsonProduct = this.findProductInJSON(dbProduct.product_id, jsonData);

        if (!jsonProduct || !jsonProduct.image) {
          this.notFoundCount++;
          console.log(`⚠️  ${dbProduct.product_id}: Not found in JSON or has no image`);
          continue;
        }

        // Compare URLs
        if (dbProduct.image !== jsonProduct.image) {
          console.log(`🔄 Updating ${dbProduct.product_id}:`);
          console.log(`   DB:   ${dbProduct.image}`);
          console.log(`   JSON: ${jsonProduct.image}`);

          try {
            await this.productModel.updateProduct(dbProduct.id, {
              image: jsonProduct.image
            });
            this.updatedCount++;
            console.log(`   ✅ Updated\n`);
          } catch (error) {
            console.error(`   ❌ Error: ${error}\n`);
          }
        } else {
          console.log(`✓ ${dbProduct.product_id}: Already in sync`);
        }
      }

      console.log('\n' + '='.repeat(80));
      console.log('📊 SYNC SUMMARY');
      console.log('='.repeat(80));
      console.log(`✅ Updated: ${this.updatedCount} products`);
      console.log(`⚠️  Not found in JSON: ${this.notFoundCount} products`);
      console.log(`✓ In sync: ${dbProducts.length - this.updatedCount - this.notFoundCount} products`);

    } catch (error) {
      console.error('❌ Error syncing image URLs:', error);
      throw error;
    } finally {
      if (databaseService.isPostgres()) {
        const pool = (databaseService as any).pool;
        if (pool) await pool.end();
      }
    }
  }
}

// Run sync
if (require.main === module) {
  const syncer = new ImageUrlSyncer();
  syncer.sync()
    .then(() => {
      console.log('\n🎉 Sync completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Sync failed:', error);
      process.exit(1);
    });
}

export { ImageUrlSyncer };

