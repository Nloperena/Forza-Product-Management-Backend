import * as fs from 'fs';
import * as path from 'path';
import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';

const JSON_FILE_PATH = path.join(__dirname, '../../data/forza_products_organized.json');

class MarineProductsSyncer {
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
      console.log('🔄 Syncing Marine product information from JSON to database...\n');
      const jsonContent = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
      const jsonData = JSON.parse(jsonContent);
      await databaseService.connect();
      await databaseService.initializeDatabase();
      this.productModel = databaseService.isPostgres()
        ? new ProductModel()
        : new ProductModel(databaseService.getDatabase());
      const dbProducts = await this.productModel.getAllProducts();
      for (const dbProduct of dbProducts) {
        if (dbProduct.industry !== 'marine_industry') continue;
        const jsonProduct = this.findProductInJSON(dbProduct.product_id, jsonData);
        if (!jsonProduct) {
          this.notFoundCount++;
          continue;
        }
        try {
          await this.productModel.updateProduct(dbProduct.id, {
            name: jsonProduct.name,
            chemistry: jsonProduct.chemistry,
            applications: jsonProduct.applications,
            benefits: jsonProduct.benefits,
            sizing: jsonProduct.sizing,
            color: jsonProduct.color,
            cleanup: jsonProduct.cleanup,
            recommended_equipment: jsonProduct.recommended_equipment
          });
          this.updatedCount++;
        } catch (error) {
          console.error(`❌ Error updating ${dbProduct.product_id}: ${error}\n`);
        }
      }
      console.log(`✅ Updated: ${this.updatedCount} Marine products`);
    } catch (error) {
      console.error('❌ Error syncing Marine products:', error);
      throw error;
    } finally {
      if (databaseService.isPostgres()) {
        const pool = (databaseService as any).pool;
        if (pool) await pool.end();
      }
    }
  }
}

async function syncMarineProducts(): Promise<void> {
  const syncer = new MarineProductsSyncer();
  await syncer.sync();
}

if (require.main === module) {
  syncMarineProducts()
    .then(() => {
      console.log('\n🎉 Sync completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Sync failed:', error);
      process.exit(1);
    });
}

export { MarineProductsSyncer, syncMarineProducts };
