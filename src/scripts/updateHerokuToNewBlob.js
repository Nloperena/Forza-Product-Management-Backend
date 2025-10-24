const { databaseService } = require('../../dist/services/database');
const { ProductModel } = require('../../dist/models/Product');

class HerokuNewBlobUpdater {
  constructor() {
    // New Vercel Blob storage URL
    this.newBlobBaseUrl = 'https://jw4to4yw6mmciodr.public.blob.vercel-storage.com/product-images';
    this.updatedProducts = [];
    this.failedUpdates = [];
  }

  async updateHerokuImageUrls() {
    try {
      console.log('🚀 Updating Heroku database with new Vercel Blob URLs...');
      
      // Connect to database
      await databaseService.connect();
      const productModel = new ProductModel(databaseService.getPool());
      
      // Get all products
      const products = await productModel.getAllProducts();
      console.log(`📊 Found ${products.length} products to process`);
      
      // Process each product
      for (const product of products) {
        console.log(`\n🔍 Processing ${product.product_id}: ${product.name}`);
        
        try {
          // Generate new image URL for the product
          const newImageUrl = `${this.newBlobBaseUrl}/${product.product_id.toLowerCase()}.png`;
          
          console.log(`   Current image: ${product.image || 'No image'}`);
          console.log(`   New image URL: ${newImageUrl}`);
          
          // Update the product with the new image URL
          await productModel.updateProduct(product.id, {
            image: newImageUrl
          });
          
          console.log(`   ✅ Successfully updated`);
          
          this.updatedProducts.push({
            productId: product.product_id,
            productName: product.name,
            newImageUrl: newImageUrl
          });
          
        } catch (error) {
          console.log(`   ❌ Error updating ${product.product_id}:`, error.message);
          this.failedUpdates.push({
            productId: product.product_id,
            productName: product.name,
            error: error.message
          });
        }
      }
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Error during update:', error);
    } finally {
      await databaseService.disconnect();
      process.exit(0);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📋 HEROKU NEW VERCEL BLOB UPDATE REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n✅ SUCCESSFULLY UPDATED: ${this.updatedProducts.length}`);
    this.updatedProducts.forEach(item => {
      console.log(`   ${item.productId}: ${item.newImageUrl}`);
    });
    
    console.log(`\n❌ FAILED UPDATES: ${this.failedUpdates.length}`);
    this.failedUpdates.forEach(item => {
      console.log(`   ${item.productId}: ${item.error}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY:');
    console.log(`Total products processed: ${this.updatedProducts.length + this.failedUpdates.length}`);
    console.log(`Successfully updated: ${this.updatedProducts.length}`);
    console.log(`Failed updates: ${this.failedUpdates.length}`);
    console.log(`Success rate: ${((this.updatedProducts.length / (this.updatedProducts.length + this.failedUpdates.length)) * 100).toFixed(2)}%`);
    console.log(`New blob base URL: ${this.newBlobBaseUrl}`);
    console.log('='.repeat(80));
  }
}

// Run the updater
const updater = new HerokuNewBlobUpdater();
updater.updateHerokuImageUrls();
