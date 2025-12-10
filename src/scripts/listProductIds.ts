import { ProductModel } from '../models/Product';
import { databaseService } from '../services/database';

async function listProductIds() {
  try {
    await databaseService.connect();
    await databaseService.initializeDatabase();

    const productModel = databaseService.isPostgres() 
      ? new ProductModel() 
      : new ProductModel(databaseService.getDatabase());

    const products = await productModel.getAllProducts();
    
    console.log(`\n📦 Total products in database: ${products.length}\n`);
    console.log('Product IDs:');
    products.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.product_id} - ${product.name}`);
    });

    // Check for products that need to be deleted
    const productsToDelete = [
      'oa75', 'oa99', 'i1000', 'r529', 'fc-car',
      'os45', 'os55', 't461', 't500', 't464',
      't-t246', 'mc739'
    ];

    const productsToMerge = [
      'cc503-aa', 'os61-adhesive', 'ic946--ca-compliant-pressure-sensitive-contact-adhesive'
    ];

    console.log('\n🔍 Checking products to delete:');
    const foundToDelete = products.filter(p => productsToDelete.includes(p.product_id));
    console.log(`  Found: ${foundToDelete.length}/${productsToDelete.length}`);
    foundToDelete.forEach(p => console.log(`    ✅ ${p.product_id}`));
    
    const notFoundToDelete = productsToDelete.filter(id => !products.find(p => p.product_id === id));
    if (notFoundToDelete.length > 0) {
      console.log(`  Not found: ${notFoundToDelete.length}`);
      notFoundToDelete.forEach(id => console.log(`    ❌ ${id}`));
    }

    console.log('\n🔄 Checking products to merge:');
    const foundToMerge = products.filter(p => productsToMerge.includes(p.product_id));
    console.log(`  Found: ${foundToMerge.length}/${productsToMerge.length}`);
    foundToMerge.forEach(p => console.log(`    ✅ ${p.product_id}`));
    
    const notFoundToMerge = productsToMerge.filter(id => !products.find(p => p.product_id === id));
    if (notFoundToMerge.length > 0) {
      console.log(`  Not found: ${notFoundToMerge.length}`);
      notFoundToMerge.forEach(id => console.log(`    ❌ ${id}`));
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listProductIds();


