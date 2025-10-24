const { databaseService } = require('../../dist/services/database');
const { ProductModel } = require('../../dist/models/Product');

class HerokuImageUrlUpdater {
  async updateHerokuImageUrls() {
    try {
      console.log('🔧 Updating Heroku database with correct image URLs...');
      
      // Connect to database
      await databaseService.connect();
      const productModel = new ProductModel(databaseService.getDatabase());
      
      // Get all products with Vercel Blob URLs that have incorrect filenames
      const products = await productModel.getAllProducts();
      const productsWithVercelImages = products.filter(p => 
        p.image && p.image.includes('vercel-storage.com')
      );
      
      console.log(`📊 Found ${productsWithVercelImages.length} products with Vercel Blob images`);
      
      let updatedCount = 0;
      const results = [];
      
      for (const product of productsWithVercelImages) {
        if (!product.image) continue;
        
        console.log(`\n🔍 Processing ${product.product_id}: ${product.name}`);
        
        try {
          // Extract current filename from Vercel Blob URL
          const currentFilename = product.image.split('/').pop() || '';
          
          // Generate correct filename based on product ID
          const correctFilename = `${product.product_id}.png`;
          
          console.log(`   Current: ${currentFilename}`);
          console.log(`   Correct: ${correctFilename}`);
          
          // Check if filename needs updating
          if (currentFilename !== correctFilename) {
            // Update the Vercel Blob URL with correct filename
            const baseUrl = product.image.substring(0, product.image.lastIndexOf('/') + 1);
            const newImageUrl = `${baseUrl}${correctFilename}`;
            
            console.log(`   🔄 Updating database: ${newImageUrl}`);
            
            // Update database
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
          } else {
            console.log(`   ✅ Filename already correct`);
          }
          
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
