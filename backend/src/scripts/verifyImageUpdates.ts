import { ProductModel } from '../models/Product';
import { databaseService } from '../services/database';

const PRODUCTS_TO_CHECK = ['C-T553', 'C-T557', 'C-W6106', 'TAC850', 'TAC-734G', 'TC467'];

async function verifyUpdates() {
  try {
    await databaseService.connect();
    await databaseService.initializeDatabase();

    const productModel = databaseService.isPostgres() 
      ? new ProductModel() 
      : new ProductModel(databaseService.getDatabase());

    const allProducts = await productModel.getAllProducts();

    console.log('\n🔍 Verifying Product Image Updates\n');
    console.log('='.repeat(80));

    for (const productId of PRODUCTS_TO_CHECK) {
      const product = allProducts.find(
        p => p.product_id?.toUpperCase() === productId.toUpperCase() ||
             p.product_id?.toUpperCase().replace(/-/g, '') === productId.toUpperCase().replace(/-/g, '')
      );

      if (product) {
        console.log(`\n📦 ${product.product_id} - ${product.full_name || product.name}`);
        console.log(`   Image: ${product.image || 'N/A'}`);
        console.log(`   Expected folder: ${product.industry}`);
      } else {
        console.log(`\n❌ ${productId} - NOT FOUND`);
      }
    }

    console.log('\n' + '='.repeat(80));
  } catch (error) {
    console.error('Error verifying updates:', error);
  } finally {
    process.exit(0);
  }
}

verifyUpdates();
