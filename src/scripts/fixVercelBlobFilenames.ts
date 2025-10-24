import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';

class VercelBlobFilenameFixer {
  async fixVercelBlobFilenames(): Promise<void> {
    try {
      console.log('🔧 Fixing Vercel Blob image filenames to match product IDs...');
      
      // Connect to database
      await databaseService.connect();
      const productModel = new ProductModel(databaseService.getDatabase());
      
      // Get all products with Vercel Blob URLs
      const products = await productModel.getAllProducts();
      const productsWithVercelImages = products.filter(p => 
        p.image && p.image.includes('vercel-storage.com')
      );
      
      console.log(`📊 Found ${productsWithVercelImages.length} products with Vercel Blob images`);
      
      let fixedCount = 0;
      const results: Array<{productId: string, oldUrl: string, newUrl: string}> = [];
      
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
          
          // Check if filename needs fixing
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
            
            fixedCount++;
          } else {
            console.log(`   ✅ Filename already correct`);
          }
          
        } catch (error) {
          console.log(`   ❌ Error processing ${product.product_id}:`, error);
        }
      }
      
      console.log('\n🎉 Vercel Blob filename fixing completed!');
      console.log(`✅ Fixed: ${fixedCount} images`);
      
      // Show summary
      if (results.length > 0) {
        console.log('\n📋 Fixed Vercel Blob Images:');
        results.forEach(result => {
          console.log(`✅ ${result.productId}: ${result.oldUrl} → ${result.newUrl}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Error fixing Vercel Blob filenames:', error);
    } finally {
      await databaseService.disconnect();
      process.exit(0);
    }
  }
}

// Run the script
if (require.main === module) {
  const fixer = new VercelBlobFilenameFixer();
  fixer.fixVercelBlobFilenames();
}

export { VercelBlobFilenameFixer };
