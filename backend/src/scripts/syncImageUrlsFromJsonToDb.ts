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
        if (item.product_id === productId) return item;
        const found = this.findProductInJSON(productId, item);
        if (found) return found;
      }
    } else if (obj && typeof obj === 'object') {
      if (obj.product_id === productId) return obj;
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
      const jsonContent = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
      const jsonData = JSON.parse(jsonContent);
      await databaseService.connect();
      await databaseService.initializeDatabase();
      this.productModel = databaseService.isPostgres()
        ? new ProductModel()
        : new ProductModel(databaseService.getDatabase());
      const dbProducts = await this.productModel.getAllProducts();
      for (const dbProduct of dbProducts) {
        if (!dbProduct.image) continue;
        const jsonProduct = this.findProductInJSON(dbProduct.product_id, jsonData);
        if (!jsonProduct || !jsonProduct.image) {
          this.notFoundCount++;
          continue;
        }
        if (dbProduct.image !== jsonProduct.image) {
          try {
            await this.productModel.updateProduct(dbProduct.id, {
              image: jsonProduct.image
            });
            this.updatedCount++;
          } catch (error) {
            console.error(`   ❌ Error: ${error}\n`);
          }
        }
      }
      console.log(`✅ Updated: ${this.updatedCount} image URLs`);
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

