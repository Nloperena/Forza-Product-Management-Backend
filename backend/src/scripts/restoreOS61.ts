import { ProductModel, Product } from '../models/Product';
import { databaseService } from '../services/database';
import * as fs from 'fs';
import * as path from 'path';

async function restoreOS61() {
  try {
    console.log('🔄 Restoring OS61 product...\n');

    // Connect to database
    await databaseService.connect();
    await databaseService.initializeDatabase();

    const productModel = databaseService.isPostgres() 
      ? new ProductModel() 
      : new ProductModel(databaseService.getDatabase());

    // Load JSON file
    const jsonPath = path.join(__dirname, '../../data/forza_products_organized.json');
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    // Find OS61 in the JSON
    let os61Product: any = null;
    
    const searchProducts = (obj: any): any => {
      if (Array.isArray(obj)) {
        for (const item of obj) {
          if (item.product_id === 'OS61') {
            return item;
          }
          const found = searchProducts(item);
          if (found) return found;
        }
      } else if (obj && typeof obj === 'object') {
        for (const key in obj) {
          const found = searchProducts(obj[key]);
          if (found) return found;
        }
      }
      return null;
    };

    os61Product = searchProducts(jsonData);

    if (!os61Product) {
      throw new Error('OS61 product not found in JSON file');
    }

    console.log('✅ Found OS61 in JSON file');
    console.log(`   Name: ${os61Product.name}`);
    console.log(`   Full Name: ${os61Product.full_name}`);

    // Check if OS61 already exists
    const existing = await productModel.getProductById('OS61');
    if (existing) {
      console.log('⚠️  OS61 already exists in database. Skipping restore.');
      return;
    }

    // Create product data
    const productData: Omit<Product, 'id' | 'created_at' | 'updated_at'> = {
      product_id: os61Product.product_id,
      name: os61Product.name,
      full_name: os61Product.full_name,
      description: os61Product.description || '',
      brand: os61Product.brand,
      industry: os61Product.industry,
      chemistry: os61Product.chemistry || undefined,
      url: os61Product.url || undefined,
      image: os61Product.image || undefined,
      benefits: os61Product.benefits || [],
      applications: os61Product.applications || [],
      technical: os61Product.technical || [],
      sizing: os61Product.sizing || [],
      published: os61Product.published !== undefined ? os61Product.published : true,
      benefits_count: os61Product.benefits_count || (os61Product.benefits?.length || 0),
      last_edited: os61Product.last_edited || new Date().toISOString()
    };

    // Create the product
    await productModel.createProduct(productData);
    
    console.log('\n✅ OS61 successfully restored to database!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error restoring OS61:', error);
    process.exit(1);
  }
}

restoreOS61();

