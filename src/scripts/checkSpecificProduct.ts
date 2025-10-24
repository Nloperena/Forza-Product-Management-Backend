import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';

class SpecificProductChecker {
  async checkSpecificProduct(productId: string): Promise<void> {
    try {
      console.log(`🔍 Checking specific product: ${productId}`);
      
      // Connect to database
      await databaseService.connect();
      const productModel = new ProductModel(databaseService.getDatabase());
      
      // Get the specific product
      const products = await productModel.getAllProducts();
      const product = products.find(p => p.product_id === productId);
      
      if (product) {
        console.log(`\n📋 Product Details:`);
        console.log(`  Product ID: ${product.product_id}`);
        console.log(`  Name: ${product.name}`);
        console.log(`  Image URL: ${product.image}`);
        console.log(`  Published: ${product.published}`);
        
        if (product.image) {
          const filename = product.image.split('/').pop() || '';
          const expectedFilename = `${product.product_id}.png`;
          
          console.log(`\n🔍 Filename Analysis:`);
          console.log(`  Current filename: ${filename}`);
          console.log(`  Expected filename: ${expectedFilename}`);
          console.log(`  Match: ${filename === expectedFilename ? '✅' : '❌'}`);
        }
      } else {
        console.log(`❌ Product not found: ${productId}`);
      }
      
    } catch (error) {
      console.error('❌ Error checking specific product:', error);
    } finally {
      await databaseService.disconnect();
      process.exit(0);
    }
  }
}

// Run the script
if (require.main === module) {
  const productId = process.argv[2] || 'FRP';
  const checker = new SpecificProductChecker();
  checker.checkSpecificProduct(productId);
}

export { SpecificProductChecker };
