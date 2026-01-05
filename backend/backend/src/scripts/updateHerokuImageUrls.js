const { databaseService } = require('../../dist/services/database');
const { ProductModel } = require('../../dist/models/Product');

class HerokuImageUrlUpdater {
  async updateHerokuImageUrls() {
    try {
      console.log('🔧 Updating Heroku database with correct image URLs...');
      
      // Connect to database
      await databaseService.connect();
      const productModel = new ProductModel(databaseService.getPool());
      
      // Get all products to update to new Vercel Blob storage
      const products = await productModel.getAllProducts();
      
      console.log(`📊 Found ${products.length} products to update to new Vercel Blob storage`);
      
      let updatedCount = 0;
      const results = [];
      
      for (const product of products) {
        if (!product.image) continue;
        
        console.log(`\n🔍 Processing ${product.product_id}: ${product.name}`);
        
        try {
          // Generate new Vercel Blob URL for the product
          const newImageUrl = `https://jw4to4yw6mmciodr.public.blob.vercel-storage.com/product-images/${product.product_id.toLowerCase()}.png`;
          
          console.log(`   Current: ${product.image}`);
          console.log(`   New: ${newImageUrl}`);
          
          // Update database with new Vercel Blob URL
          console.log(`   🔄 Updating database: ${newImageUrl}`);
          
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
          console.log(`   ❌ Error processing ${product.product_id}:`, error);
        }
      }
      
      console.log('\n🎉 Heroku image URL update completed!');
      console.log(`✅ Updated: ${updatedCount} images`);
      
      // Show summary
      if (results.length > 0) {
        console.log('\n📋 Updated Images:');
        results.forEach(result => {
          console.log(`✅ ${result.productId}: ${result.oldUrl} → ${result.newUrl}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Error updating Heroku image URLs:', error);
    } finally {
      await databaseService.disconnect();
      process.exit(0);
    }
  }
}

// Run the script
const updater = new HerokuImageUrlUpdater();
updater.updateHerokuImageUrls();
