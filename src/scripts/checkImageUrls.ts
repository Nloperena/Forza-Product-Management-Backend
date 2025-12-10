import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';

class ImageUrlChecker {
  async checkImageUrls(): Promise<void> {
    try {
      console.log('🔍 Checking current image URLs in database...');
      
      // Connect to database
      await databaseService.connect();
      const productModel = new ProductModel(databaseService.getDatabase());
      
      // Get all products with images
      const products = await productModel.getAllProducts();
      const productsWithImages = products.filter(p => p.image);
      
      console.log(`📊 Found ${productsWithImages.length} products with images`);
      
      // Group by URL type
      const urlTypes: { [key: string]: number } = {};
      const sampleUrls: { [key: string]: string[] } = {};
      
      for (const product of productsWithImages) {
        if (!product.image) continue;
        
        let urlType = 'unknown';
        if (product.image.includes('vercel-storage.com')) {
          urlType = 'vercel-blob';
        } else if (product.image.startsWith('/scraped-images/')) {
          urlType = 'local-scraped';
        } else if (product.image.startsWith('/product-images/')) {
          urlType = 'local-product';
        } else if (product.image.includes('forzabuilt.com')) {
          urlType = 'wordpress';
        } else if (product.image.includes('placeholder')) {
          urlType = 'placeholder';
        }
        
        urlTypes[urlType] = (urlTypes[urlType] || 0) + 1;
        
        if (!sampleUrls[urlType]) {
          sampleUrls[urlType] = [];
        }
        if (sampleUrls[urlType].length < 3) {
          sampleUrls[urlType].push(`${product.product_id}: ${product.image}`);
        }
      }
      
      console.log('\n📋 URL Types Summary:');
      Object.entries(urlTypes).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} products`);
        if (sampleUrls[type]) {
          sampleUrls[type].forEach(url => {
            console.log(`    - ${url}`);
          });
        }
      });
      
      // Show first 10 products with their image URLs
      console.log('\n📋 Sample Products with Images:');
      productsWithImages.slice(0, 10).forEach(product => {
        console.log(`  ${product.product_id}: ${product.image}`);
      });
      
    } catch (error) {
      console.error('❌ Error checking image URLs:', error);
    } finally {
      await databaseService.disconnect();
      process.exit(0);
    }
  }
}

// Run the script
if (require.main === module) {
  const checker = new ImageUrlChecker();
  checker.checkImageUrls();
}

export { ImageUrlChecker };



