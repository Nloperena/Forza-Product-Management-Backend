import * as fs from 'fs';
import * as path from 'path';
import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';

const JSON_FILE_PATH = path.join(__dirname, '../../data/forza_products_organized.json');

class BenefitsTechnicalSyncer {
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
      console.log('🔄 Syncing benefits and technical data from JSON to database...\n');
      
      // Load JSON
      if (!fs.existsSync(JSON_FILE_PATH)) {
        console.error(`❌ JSON not found at ${JSON_FILE_PATH}`);
        return;
      }
      const jsonContent = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
      const jsonData = JSON.parse(jsonContent);

      await databaseService.connect();
      await databaseService.initializeDatabase();
      this.productModel = databaseService.isPostgres()
        ? new ProductModel()
        : new ProductModel(databaseService.getDatabase());
      
      const dbProducts = await this.productModel.getAllProducts();
      console.log(`📊 Found ${dbProducts.length} products in database\n`);

      for (const dbProduct of dbProducts) {
        const jsonProduct = this.findProductInJSON(dbProduct.product_id, jsonData);
        if (!jsonProduct) {
          this.notFoundCount++;
          continue;
        }

        const updates: any = {};
        let hasUpdates = false;

        // Update benefits if JSON has them and they're different
        if (jsonProduct.benefits && Array.isArray(jsonProduct.benefits) && jsonProduct.benefits.length > 0) {
          const jsonBenefitsStr = JSON.stringify(jsonProduct.benefits);
          const dbBenefitsStr = JSON.stringify(dbProduct.benefits || []);
          
          if (jsonBenefitsStr !== dbBenefitsStr) {
            updates.benefits = jsonProduct.benefits;
            updates.benefits_count = jsonProduct.benefits.length;
            hasUpdates = true;
          }
        }

        // Update technical if JSON has them and they're different
        if (jsonProduct.technical && Array.isArray(jsonProduct.technical) && jsonProduct.technical.length > 0) {
          const jsonTechnicalStr = JSON.stringify(jsonProduct.technical);
          const dbTechnicalStr = JSON.stringify(dbProduct.technical || []);
          
          if (jsonTechnicalStr !== dbTechnicalStr) {
            updates.technical = jsonProduct.technical;
            hasUpdates = true;
          }
        }

        if (hasUpdates) {
          try {
            await this.productModel.updateProduct(dbProduct.id, updates);
            console.log(`✅ Updated ${dbProduct.product_id}: ${updates.benefits ? `benefits (${updates.benefits.length})` : ''} ${updates.technical ? `technical (${updates.technical.length})` : ''}`);
            this.updatedCount++;
          } catch (error) {
            console.error(`   ❌ Error updating ${dbProduct.product_id}: ${error}\n`);
          }
        }
      }

      console.log(`\n📊 Summary:`);
      console.log(`✅ Updated: ${this.updatedCount} products`);
      console.log(`⏭️  Skipped: ${dbProducts.length - this.updatedCount - this.notFoundCount} products (already in sync)`);
      if (this.notFoundCount > 0) {
        console.log(`⚠️  Not found in JSON: ${this.notFoundCount} products`);
      }
    } catch (error) {
      console.error('❌ Error syncing benefits and technical:', error);
      throw error;
    }
  }
}

if (require.main === module) {
  const syncer = new BenefitsTechnicalSyncer();
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

export { BenefitsTechnicalSyncer };

