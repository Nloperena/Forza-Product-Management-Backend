import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { URL } from 'url';

interface DownloadResult {
  success: boolean;
  localPath?: string;
  error?: string;
}

class ImageDownloader {
  private downloadDir: string;

  constructor() {
    this.downloadDir = path.join(__dirname, '../../public/uploads/product-images');
    
    // Create download directory if it doesn't exist
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  private async downloadImage(url: string, filename: string): Promise<DownloadResult> {
    return new Promise((resolve) => {
      try {
        const parsedUrl = new URL(url);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;
        
        const filePath = path.join(this.downloadDir, filename);
        const file = fs.createWriteStream(filePath);
        
        const request = protocol.get(url, (response) => {
          if (response.statusCode === 200) {
            response.pipe(file);
            
            file.on('finish', () => {
              file.close();
              resolve({
                success: true,
                localPath: filePath
              });
            });
          } else {
            resolve({
              success: false,
              error: `HTTP ${response.statusCode}`
            });
          }
        });
        
        request.on('error', (error) => {
          resolve({
            success: false,
            error: error.message
          });
        });
        
        request.setTimeout(30000, () => {
          request.destroy();
          resolve({
            success: false,
            error: 'Download timeout'
          });
        });
        
      } catch (error) {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  private getFilenameFromUrl(url: string, productId: string): string {
    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname;
      const extension = path.extname(pathname) || '.png';
      return `${productId}${extension}`;
    } catch {
      return `${productId}.png`;
    }
  }

  async downloadAllImages(): Promise<void> {
    try {
      console.log('🖼️  Starting image download process...');
      
      // Connect to database
      await databaseService.connect();
      const productModel = new ProductModel(databaseService.getDatabase());
      
      // Get all products with WordPress images
      const products = await productModel.getAllProducts();
      const productsWithImages = products.filter(p => 
        p.image && p.image.includes('forzabuilt.com')
      );
      
      console.log(`📊 Found ${productsWithImages.length} products with WordPress images`);
      
      if (productsWithImages.length === 0) {
        console.log('ℹ️  No products with WordPress images found');
        return;
      }
      
      let successCount = 0;
      let errorCount = 0;
      const results: Array<{productId: string, oldUrl: string, newUrl?: string, error?: string}> = [];
      
      for (const product of productsWithImages) {
        if (!product.image) continue;
        
        console.log(`\n📥 Processing ${product.product_id}: ${product.name}`);
        console.log(`   Original URL: ${product.image}`);
        
        try {
          // Download image
          const filename = this.getFilenameFromUrl(product.image, product.product_id);
          console.log(`   Downloading to: ${filename}`);
          
          const downloadResult = await this.downloadImage(product.image, filename);
          
          if (!downloadResult.success) {
            console.log(`   ❌ Download failed: ${downloadResult.error}`);
            results.push({
              productId: product.product_id,
              oldUrl: product.image,
              error: downloadResult.error
            });
            errorCount++;
            continue;
          }
          
          console.log(`   ✅ Downloaded successfully`);
          
          // Update database with local path
          const newImageUrl = `/uploads/product-images/${filename}`;
          console.log(`   💾 Updating database with: ${newImageUrl}`);
          
          await productModel.updateProduct(product.id, {
            image: newImageUrl
          });
          
          console.log(`   ✅ Database updated successfully`);
          
          results.push({
            productId: product.product_id,
            oldUrl: product.image,
            newUrl: newImageUrl
          });
          
          successCount++;
          
        } catch (error) {
          console.log(`   ❌ Error processing ${product.product_id}:`, error);
          results.push({
            productId: product.product_id,
            oldUrl: product.image,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          errorCount++;
        }
      }
      
      console.log('\n🎉 Image download completed!');
      console.log(`✅ Successfully processed: ${successCount} images`);
      console.log(`❌ Errors: ${errorCount} images`);
      
      // Show summary
      console.log('\n📋 Results Summary:');
      results.forEach(result => {
        if (result.newUrl) {
          console.log(`✅ ${result.productId}: ${result.newUrl}`);
        } else {
          console.log(`❌ ${result.productId}: ${result.error}`);
        }
      });
      
      console.log(`\n📁 Images saved to: ${this.downloadDir}`);
      console.log('🌐 You can now access images via: http://localhost:5000/uploads/product-images/[filename]');
      
    } catch (error) {
      console.error('❌ Error in image download process:', error);
    } finally {
      await databaseService.disconnect();
      process.exit(0);
    }
  }
}

// Run the script
if (require.main === module) {
  const downloader = new ImageDownloader();
  downloader.downloadAllImages();
}

export { ImageDownloader };
