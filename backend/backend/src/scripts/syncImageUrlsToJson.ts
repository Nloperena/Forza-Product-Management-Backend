import * as fs from 'fs';
import * as path from 'path';
import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';
import * as dotenv from 'dotenv';

dotenv.config();

const JSON_FILE_PATH = path.join(__dirname, '../../data/forza_products_organized.json');

class ImageUrlJsonSyncer {
  private productModel: ProductModel;

  constructor() {
    if (databaseService.isPostgres()) {
      this.productModel = new ProductModel();
    } else {
      this.productModel = new ProductModel(databaseService.getDatabase());
    }
  }

  async syncImageUrlsToJson(): Promise<void> {
    console.log('🔄 Syncing image URLs from database to JSON file...\n');

    try {
      // Read current JSON
      const jsonContent = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf-8'));
      const products = await this.productModel.getAllProducts();

      console.log(`Found ${products.length} products in database\n`);

      // Create a map of product_id -> image URL
      const imageMap = new Map<string, string>();
      products.forEach(product => {
        if (product.image) {
          imageMap.set(product.product_id, product.image);
        }
      });

      // Update JSON structure
      let updatedCount = 0;
      
      const updateProductsInSection = (section: any): void => {
        if (Array.isArray(section)) {
          section.forEach((item: any) => {
            if (item.product_id && imageMap.has(item.product_id)) {
              const newImageUrl = imageMap.get(item.product_id)!;
              if (item.image !== newImageUrl) {
                console.log(`✅ Updating ${item.product_id}: "${item.image}" -> "${newImageUrl}"`);
                item.image = newImageUrl;
                updatedCount++;
              }
            }
          });
        } else if (typeof section === 'object' && section !== null) {
          Object.values(section).forEach((value: any) => {
            updateProductsInSection(value);
          });
        }
      };

      // Navigate through the JSON structure
      if (jsonContent.forza_products_organized) {
        const bond = jsonContent.forza_products_organized.forza_bond;
        const seal = jsonContent.forza_products_organized.forza_seal;
        const tape = jsonContent.forza_products_organized.forza_tape;

        if (bond?.products) {
          Object.values(bond.products).forEach((industry: any) => {
            if (industry.products) {
              updateProductsInSection(industry.products);
            }
          });
        }

        if (seal?.products) {
          Object.values(seal.products).forEach((industry: any) => {
            if (industry.products) {
              updateProductsInSection(industry.products);
            }
          });
        }

        if (tape?.products) {
          Object.values(tape.products).forEach((industry: any) => {
            if (industry.products) {
              updateProductsInSection(industry.products);
            }
          });
        }
      }

      // Write updated JSON
      fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(jsonContent, null, 2), 'utf-8');

      console.log(`\n📊 Summary:`);
      console.log(`✅ Updated: ${updatedCount} products in JSON file`);
      console.log(`💾 JSON file saved to: ${JSON_FILE_PATH}`);

    } catch (error) {
      console.error('❌ Error syncing image URLs:', error);
      throw error;
    }
  }
}

async function main() {
  try {
    await databaseService.connect();
    await databaseService.initializeDatabase();

    const syncer = new ImageUrlJsonSyncer();
    await syncer.syncImageUrlsToJson();

    console.log('\n✅ Image URL sync completed!');
  } catch (error) {
    console.error('❌ Failed to sync image URLs:', error);
    process.exit(1);
  } finally {
    await databaseService.disconnect();
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

export { ImageUrlJsonSyncer };

