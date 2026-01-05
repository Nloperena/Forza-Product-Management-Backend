import { ProductModel } from '../models/Product';
import { databaseService } from '../services/database';

async function addCT5530() {
  try {
    await databaseService.connect();
    await databaseService.initializeDatabase();

    const productModel = databaseService.isPostgres() 
      ? new ProductModel() 
      : new ProductModel(databaseService.getDatabase());

    // Check if product already exists
    const existing = await productModel.getProductById('C-T5530');
    if (existing) {
      console.log('✅ C-T5530 already exists in database');
      console.log(`   Current image: ${existing.image || 'N/A'}`);
      return;
    }

    // Create minimal product data
    const newProduct = {
      id: 'C-T5530',
      product_id: 'C-T5530',
      name: 'C-T5530',
      full_name: 'C-T5530',
      description: '.',
      brand: 'forza_tape',
      industry: 'construction_industry',
      chemistry: '.',
      url: '.',
      image: 'https://jw4to4yw6mmciodr.public.blob.vercel-storage.com/product-images/Construction/C-T5530 Tape.png',
      benefits: [],
      applications: [],
      technical: [],
      sizing: [],
      published: false,
      benefits_count: 0,
    };

    console.log('\n➕ Adding C-T5530 to database...\n');
    const created = await productModel.createProduct(newProduct);
    
    console.log('✅ C-T5530 added successfully!');
    console.log(`   Product ID: ${created.product_id}`);
    console.log(`   Image: ${created.image}`);
  } catch (error: any) {
    console.error('❌ Error adding C-T5530:', error.message);
  } finally {
    process.exit(0);
  }
}

addCT5530();

