import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';

class ImageFilenameFixer {
  async fixImageFilenames(): Promise<void> {
    try {
      console.log('🔧 Fixing image filenames to match product IDs...');
      
      // Connect to database
      await databaseService.connect();
      const productModel = new ProductModel(databaseService.getDatabase());
      
      // Get all products
      const products = await productModel.getAllProducts();
      const productsWithImages = products.filter(p => p.image);
      
      console.log(`📊 Found ${productsWithImages.length} products with images`);
      
      let fixedCount = 0;
      const results: Array<{productId: string, oldUrl: string, newUrl: string}> = [];
      
      for (const product of productsWithImages) {
        if (!product.image) continue;
        
        console.log(`\n🔍 Processing ${product.product_id}: ${product.name}`);
        
        try {
          // Extract current filename from URL
          let currentFilename = '';
          if (product.image.includes('/')) {
            currentFilename = product.image.split('/').pop() || '';
          } else {
            currentFilename = product.image;
          }
          
          // Generate correct filename based on product ID
          const correctFilename = `${product.product_id}.png`;
          
          console.log(`   Current: ${currentFilename}`);
          console.log(`   Correct: ${correctFilename}`);
          
          // Check if filename needs fixing
          if (currentFilename !== correctFilename) {
            let newImageUrl = '';
            
            if (product.image.includes('vercel-storage.com')) {
              // Vercel Blob URL - update the filename part
              const baseUrl = product.image.substring(0, product.image.lastIndexOf('/') + 1);
              newImageUrl = `${baseUrl}${correctFilename}`;
            } else if (product.image.startsWith('/scraped-images/')) {
              // Local URL - update the filename part
              newImageUrl = `/scraped-images/${correctFilename}`;
            } else {
              // Keep original URL if it's not one of our expected formats
              console.log(`   ⚠️  Skipping - unknown URL format: ${product.image}`);
              continue;
            }
            
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
      
      console.log('\n🎉 Image filename fixing completed!');
      console.log(`✅ Fixed: ${fixedCount} images`);
      
      // Show summary
      if (results.length > 0) {
        console.log('\n📋 Fixed Images:');
        results.forEach(result => {
          console.log(`✅ ${result.productId}: ${result.oldUrl} → ${result.newUrl}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Error fixing image filenames:', error);
    } finally {
      await databaseService.disconnect();
      process.exit(0);
    }
  }
}

// Run the script
if (require.main === module) {
  const fixer = new ImageFilenameFixer();
  fixer.fixImageFilenames();
}

export { ImageFilenameFixer };
