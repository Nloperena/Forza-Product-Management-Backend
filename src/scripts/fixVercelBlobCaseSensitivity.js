const { databaseService } = require('../../dist/services/database');
const { ProductModel } = require('../../dist/models/Product');

class VercelBlobCaseFixer {
  async fixVercelBlobCaseSensitivity() {
    try {
      console.log('🔧 Fixing Vercel Blob case sensitivity in Heroku database...');
      
      // Connect to database
      await databaseService.connect();
      const productModel = new ProductModel(databaseService.getPool());
      
      // Get all products with Vercel Blob URLs
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
          
          // Convert to lowercase to match what's actually stored in Vercel Blob
          const correctFilename = currentFilename.toLowerCase();
          
          console.log(`   Current: ${currentFilename}`);
          console.log(`   Correct: ${correctFilename}`);
          
          // Check if filename needs updating (case change)
          if (currentFilename !== correctFilename) {
            // Update the Vercel Blob URL with correct lowercase filename
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
      
      console.log('\n🎉 Vercel Blob case sensitivity fix completed!');
      console.log(`✅ Updated: ${updatedCount} images`);
      
      // Show summary
      if (results.length > 0) {
        console.log('\n📋 Updated Images:');
        results.forEach(result => {
          console.log(`✅ ${result.productId}: ${result.oldUrl} → ${result.newUrl}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Error fixing Vercel Blob case sensitivity:', error);
    } finally {
      await databaseService.disconnect();
      process.exit(0);
    }
  }
}

// Run the script
const fixer = new VercelBlobCaseFixer();
fixer.fixVercelBlobCaseSensitivity();



