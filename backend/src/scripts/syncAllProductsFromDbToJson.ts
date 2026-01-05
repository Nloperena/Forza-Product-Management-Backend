import * as fs from 'fs';
import * as path from 'path';
import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';

const JSON_FILE_PATH = path.join(__dirname, '../../data/forza_products_organized.json');

class DbToJsonSyncer {
  private productModel: ProductModel | null = null;
  private updatedCount: number = 0;

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
      console.log('🔄 Syncing all product data from database to JSON...\n');
      
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
          continue;
        }

        let hasChanges = false;

        // Update name and full_name
        if (dbProduct.name && jsonProduct.name !== dbProduct.name) {
          jsonProduct.name = dbProduct.name;
          hasChanges = true;
        }
        if (dbProduct.full_name && jsonProduct.full_name !== dbProduct.full_name) {
          jsonProduct.full_name = dbProduct.full_name;
          hasChanges = true;
        }

        // Update description
        if (dbProduct.description && jsonProduct.description !== dbProduct.description) {
          jsonProduct.description = dbProduct.description;
          hasChanges = true;
        }

        // Update image
        if (dbProduct.image && jsonProduct.image !== dbProduct.image) {
          jsonProduct.image = dbProduct.image;
          hasChanges = true;
        }

        // Update chemistry
        if (dbProduct.chemistry && jsonProduct.chemistry !== dbProduct.chemistry) {
          jsonProduct.chemistry = dbProduct.chemistry;
          hasChanges = true;
        }

        // Update benefits
        if (dbProduct.benefits && JSON.stringify(jsonProduct.benefits) !== JSON.stringify(dbProduct.benefits)) {
          jsonProduct.benefits = dbProduct.benefits;
          hasChanges = true;
        }

        // Update applications
        if (dbProduct.applications && JSON.stringify(jsonProduct.applications) !== JSON.stringify(dbProduct.applications)) {
          jsonProduct.applications = dbProduct.applications;
          hasChanges = true;
        }

        // Update technical
        if (dbProduct.technical && JSON.stringify(jsonProduct.technical) !== JSON.stringify(dbProduct.technical)) {
          jsonProduct.technical = dbProduct.technical;
          hasChanges = true;
        }

        // Update sizing
        if (dbProduct.sizing && JSON.stringify(jsonProduct.sizing) !== JSON.stringify(dbProduct.sizing)) {
          jsonProduct.sizing = dbProduct.sizing;
          hasChanges = true;
        }

        // Update color
        if (dbProduct.color && jsonProduct.color !== dbProduct.color) {
          jsonProduct.color = dbProduct.color;
          hasChanges = true;
        }

        // Update cleanup
        if (dbProduct.cleanup && jsonProduct.cleanup !== dbProduct.cleanup) {
          jsonProduct.cleanup = dbProduct.cleanup;
          hasChanges = true;
        }

        // Update recommended_equipment
        if (dbProduct.recommended_equipment && jsonProduct.recommended_equipment !== dbProduct.recommended_equipment) {
          jsonProduct.recommended_equipment = dbProduct.recommended_equipment;
          hasChanges = true;
        }

        if (hasChanges) {
          console.log(`✅ Updated ${dbProduct.product_id}: ${dbProduct.name || dbProduct.full_name}`);
          this.updatedCount++;
        }
      }

      if (this.updatedCount > 0) {
        fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(jsonData, null, 2), 'utf-8');
        console.log(`\n📊 Summary:`);
        console.log(`✅ Updated: ${this.updatedCount} products in JSON file`);
        console.log(`💾 JSON file saved to: ${JSON_FILE_PATH}`);
      } else {
        console.log(`\n✅ No updates needed - JSON is already in sync with database`);
      }
    } catch (error) {
      console.error('❌ Error syncing from database to JSON:', error);
      throw error;
    }
  }
}

if (require.main === module) {
  const syncer = new DbToJsonSyncer();
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

export { DbToJsonSyncer };

