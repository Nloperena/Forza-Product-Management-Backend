import { ProductModel } from '../models/Product';
import { databaseService } from '../services/database';
import { ALLOWED_PRODUCT_IDS, normalizeProductId, isProductAllowed } from '../config/allowedProducts';

async function verifyWhitelist() {
  try {
    console.log('🔍 Verifying product whitelist...\n');

    // Connect to database
    await databaseService.connect();
    await databaseService.initializeDatabase();

    const productModel = databaseService.isPostgres() 
      ? new ProductModel() 
      : new ProductModel(databaseService.getDatabase());

    const allProducts = await productModel.getAllProducts();
    
    console.log(`📦 Total products in database: ${allProducts.length}`);
    console.log(`📋 Products in whitelist: ${ALLOWED_PRODUCT_IDS.length}\n`);

    // Check which whitelist products exist in database
    const foundProducts: string[] = [];
    const missingProducts: string[] = [];
    const productsInDb: string[] = allProducts.map(p => p.product_id);

    for (const allowedId of ALLOWED_PRODUCT_IDS) {
      const normalized = normalizeProductId(allowedId);
      const found = productsInDb.some(dbId => normalizeProductId(dbId) === normalized);
      
      if (found) {
        const actualId = productsInDb.find(dbId => normalizeProductId(dbId) === normalized);
        foundProducts.push(actualId || allowedId);
      } else {
        missingProducts.push(allowedId);
      }
    }

    console.log(`✅ Found in database: ${foundProducts.length}/${ALLOWED_PRODUCT_IDS.length}`);
    if (foundProducts.length > 0) {
      console.log('\nFound products:');
      foundProducts.forEach(id => console.log(`  ✓ ${id}`));
    }

    if (missingProducts.length > 0) {
      console.log(`\n⚠️  Missing from database: ${missingProducts.length}`);
      console.log('\nMissing products:');
      missingProducts.forEach(id => console.log(`  ✗ ${id}`));
    }

    // Check how many products would be filtered
    const filteredProducts = allProducts.filter(p => isProductAllowed(p.product_id));
    console.log(`\n📊 Filtering results:`);
    console.log(`   - Total products: ${allProducts.length}`);
    console.log(`   - Allowed products: ${filteredProducts.length}`);
    console.log(`   - Filtered out: ${allProducts.length - filteredProducts.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyWhitelist();


