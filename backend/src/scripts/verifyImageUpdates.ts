import { ProductModel } from '../models/Product';
import { databaseService } from '../services/database';

async function verifyImageUpdates() {
  try {
    console.log('🔍 Verifying image path updates...\n');

    await databaseService.connect();
    await databaseService.initializeDatabase();

    const productModel = databaseService.isPostgres() 
      ? new ProductModel() 
      : new ProductModel(databaseService.getDatabase());

    // Check a few specific products
    const testProducts = ['FRP', 'C-T731', 'C-T564', 'IC932', 'RC826'];
    
    console.log('Checking specific products:');
    for (const productId of testProducts) {
      const product = await productModel.getProductById(productId);
      if (product) {
        const status = product.image?.startsWith('/images/Product-Mockups/') ? '✅ NEW' : 
                      product.image?.startsWith('http') ? '⚠️  OLD (Vercel)' : 
                      '❓ OTHER';
        console.log(`  ${productId}: ${status}`);
        console.log(`    Image: ${product.image}`);
      } else {
        console.log(`  ${productId}: ❌ Not found`);
      }
    }

    // Count products with new vs old paths
    const allProducts = await productModel.getAllProducts();
    const newPathCount = allProducts.filter(p => p.image?.startsWith('/images/Product-Mockups/')).length;
    const oldPathCount = allProducts.filter(p => p.image?.startsWith('http')).length;
    const otherPathCount = allProducts.filter(p => p.image && !p.image.startsWith('/images/Product-Mockups/') && !p.image.startsWith('http')).length;

    console.log('\n📊 Summary:');
    console.log(`  Total products: ${allProducts.length}`);
    console.log(`  ✅ New paths (/images/Product-Mockups/): ${newPathCount}`);
    console.log(`  ⚠️  Old paths (Vercel Blob URLs): ${oldPathCount}`);
    console.log(`  ❓ Other paths: ${otherPathCount}`);

    // Show database type
    console.log(`\n💾 Database type: ${databaseService.isPostgres() ? 'PostgreSQL' : 'SQLite'}`);
    if (databaseService.isPostgres()) {
      console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);
    } else {
      console.log(`   DB Path: ${process.env.DB_PATH || './data/products.db'}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyImageUpdates();

