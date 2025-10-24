import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';
import fs from 'fs';
import path from 'path';

class ScrapedImageOrganizer {
  private sourceDir: string;
  private targetDir: string;

  constructor() {
    this.sourceDir = path.join(__dirname, '../../public/uploads/product-images');
    this.targetDir = path.join(__dirname, '../../public/scraped-images');
    
    // Create target directory if it doesn't exist
    if (!fs.existsSync(this.targetDir)) {
      fs.mkdirSync(this.targetDir, { recursive: true });
    }
  }

  async organizeScrapedImages(): Promise<void> {
    try {
      console.log('📁 Organizing scraped images...');
      console.log(`📂 Source: ${this.sourceDir}`);
      console.log(`📂 Target: ${this.targetDir}`);
      
      // Connect to database
      await databaseService.connect();
      const productModel = new ProductModel(databaseService.getDatabase());
      
      // Get all products with local images
      const products = await productModel.getAllProducts();
      const productsWithLocalImages = products.filter(p => 
        p.image && p.image.startsWith('/product-images/')
      );
      
      console.log(`📊 Found ${productsWithLocalImages.length} products with local images`);
      
      let movedCount = 0;
      let updatedCount = 0;
      const results: Array<{productId: string, oldPath: string, newPath: string}> = [];
      
      for (const product of productsWithLocalImages) {
        if (!product.image) continue;
        
        console.log(`\n📦 Processing ${product.product_id}: ${product.name}`);
        
        try {
          // Extract filename from current path
          const filename = path.basename(product.image);
          const sourcePath = path.join(this.sourceDir, filename);
          const targetPath = path.join(this.targetDir, filename);
          
          // Check if source file exists
          if (!fs.existsSync(sourcePath)) {
            console.log(`   ⚠️  Source file not found: ${sourcePath}`);
            continue;
          }
          
          // Move file to scraped-images folder
          console.log(`   📁 Moving: ${filename}`);
          fs.renameSync(sourcePath, targetPath);
          
          // Update database with new path
          const newImageUrl = `/scraped-images/${filename}`;
          console.log(`   💾 Updating database: ${newImageUrl}`);
          
          await productModel.updateProduct(product.id, {
            image: newImageUrl
          });
          
          console.log(`   ✅ Successfully moved and updated`);
          
          results.push({
            productId: product.product_id,
            oldPath: product.image,
            newPath: newImageUrl
          });
          
          movedCount++;
          updatedCount++;
          
        } catch (error) {
          console.log(`   ❌ Error processing ${product.product_id}:`, error);
        }
      }
      
      console.log('\n🎉 Scraped images organization completed!');
      console.log(`✅ Files moved: ${movedCount}`);
      console.log(`✅ Database records updated: ${updatedCount}`);
      
      // Show summary
      console.log('\n📋 Results Summary:');
      results.forEach(result => {
        console.log(`✅ ${result.productId}: ${result.oldPath} → ${result.newPath}`);
      });
      
      console.log(`\n📁 Images now located in: ${this.targetDir}`);
      console.log('🌐 Access via: http://localhost:5000/scraped-images/[filename]');
      
    } catch (error) {
      console.error('❌ Error organizing scraped images:', error);
    } finally {
      await databaseService.disconnect();
      process.exit(0);
    }
  }
}

// Run the script
if (require.main === module) {
  const organizer = new ScrapedImageOrganizer();
  organizer.organizeScrapedImages();
}

export { ScrapedImageOrganizer };
