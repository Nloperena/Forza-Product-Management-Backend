const { databaseService } = require('./dist/services/database');
const { ProductModel } = require('./dist/models/Product');

class NewBlobUpdater {
  async updateToNewBlob() {
    try {
      console.log('🚀 Updating Heroku database with new Vercel Blob URLs...');
      
      // Connect to database
      await databaseService.connect();
      const productModel = new ProductModel(databaseService.getPool());
      
      // Get all products
      const products = await productModel.getAllProducts();
      console.log(`📊 Found ${products.length} products to process`);
      
      let updatedCount = 0;
      const results = [];
      
      for (const product of products) {
        console.log(`\n🔍 Processing ${product.product_id}: ${product.name}`);
        
        try {
          // Generate new Vercel Blob URL for the product
          const newImageUrl = `https://jw4to4yw6mmciodr.public.blob.vercel-storage.com/product-images/${product.product_id.toLowerCase()}.png`;
          
          console.log(`   Current: ${product.image || 'No image'}`);
          console.log(`   New: ${newImageUrl}`);
          
          // Update database with new Vercel Blob URL
          await productModel.updateProduct(product.id, {
            image: newImageUrl
          });
          
          console.log(`   ✅ Successfully updated`);
          
          results.push({
            productId: product.product_id,
            oldUrl: product.image,
            newUrl: newImageUrl
          });
          
          updatedCount++;
          
        } catch (error) {
          console.log(`   ❌ Error processing ${product.product_id}:`, error.message);
        }
      }
      
      console.log('\n🎉 New Vercel Blob update completed!');
      console.log(`✅ Updated: ${updatedCount} products`);
      
      // Show summary
      if (results.length > 0) {
        console.log('\n📋 Updated Images:');
        results.forEach(result => {
          console.log(`✅ ${result.productId}: ${result.oldUrl} → ${result.newUrl}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Error updating to new Vercel Blob:', error);
    } finally {
      await databaseService.disconnect();
      process.exit(0);
    }
  }
}

// Run the updater
const updater = new NewBlobUpdater();
updater.updateToNewBlob();



