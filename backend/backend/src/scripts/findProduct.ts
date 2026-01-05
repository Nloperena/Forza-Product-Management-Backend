import { ProductModel } from '../models/Product';
import { databaseService } from '../services/database';

async function findProduct() {
  try {
    await databaseService.connect();
    await databaseService.initializeDatabase();

    const productModel = databaseService.isPostgres() 
      ? new ProductModel() 
      : new ProductModel(databaseService.getDatabase());

    const allProducts = await productModel.getAllProducts();

    console.log('\n🔍 Searching for C-T5530 related products\n');
    console.log('='.repeat(80));

    // Search for products containing "5530" or "C-T5530"
    const matches = allProducts.filter(p => {
      const productId = (p.product_id || '').toUpperCase();
      const name = (p.name || '').toUpperCase();
      return productId.includes('5530') || name.includes('5530') || productId.includes('C-T5530');
    });

    if (matches.length > 0) {
      matches.forEach(product => {
        console.log(`\n📦 Product ID: ${product.product_id}`);
        console.log(`   Name: ${product.full_name || product.name}`);
        console.log(`   Image: ${product.image || 'N/A'}`);
        console.log(`   Industry: ${product.industry}`);
      });
    } else {
      console.log('\n❌ No products found matching C-T5530');
      console.log('\n📋 All Construction products with "C-T" prefix:');
      const constructionProducts = allProducts
        .filter(p => p.industry === 'construction_industry' && p.product_id?.startsWith('C-T'))
        .slice(0, 20);
      constructionProducts.forEach(p => {
        console.log(`   ${p.product_id} - ${p.name}`);
      });
    }

    console.log('\n' + '='.repeat(80));
  } catch (error) {
    console.error('Error finding product:', error);
  } finally {
    process.exit(0);
  }
}

findProduct();






