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

class ImportImageDownloader {
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

  async downloadImportImages(): Promise<void> {
    try {
      console.log('🖼️  Starting import images download process...');
      
      // Load the import data
      const importDataPath = path.join(__dirname, '../../backend-import.json');
      const importProducts = JSON.parse(fs.readFileSync(importDataPath, 'utf8'));
      
      console.log(`📊 Found ${importProducts.length} products in import file`);
      
      // Connect to database
      await databaseService.connect();
      const productModel = new ProductModel(databaseService.getDatabase());
      
      let successCount = 0;
      let errorCount = 0;
      const results: Array<{productId: string, oldUrl: string, newUrl?: string, error?: string}> = [];
      
      for (const importProduct of importProducts) {
        if (!importProduct.image || !importProduct.image.includes('forzabuilt.com')) {
          console.log(`\n⏭️  Skipping ${importProduct.product_id}: No WordPress image URL`);
          continue;
        }
        
        console.log(`\n📥 Processing ${importProduct.product_id}: ${importProduct.name}`);
        console.log(`   Original URL: ${importProduct.image}`);
        
        try {
          // Download image
          const filename = this.getFilenameFromUrl(importProduct.image, importProduct.product_id);
          console.log(`   Downloading to: ${filename}`);
          
          const downloadResult = await this.downloadImage(importProduct.image, filename);
          
          if (!downloadResult.success) {
            console.log(`   ❌ Download failed: ${downloadResult.error}`);
            results.push({
              productId: importProduct.product_id,
              oldUrl: importProduct.image,
              error: downloadResult.error
            });
            errorCount++;
            continue;
          }
          
          console.log(`   ✅ Downloaded successfully`);
          
          // Update database with local path
          const newImageUrl = `/product-images/${filename}`;
          console.log(`   💾 Updating database with: ${newImageUrl}`);
          
          // Find the product in database
          const products = await productModel.getAllProducts();
          const dbProduct = products.find(p => p.product_id === importProduct.product_id);
          
          if (dbProduct) {
            await productModel.updateProduct(dbProduct.id, {
              image: newImageUrl
            });
            console.log(`   ✅ Database updated successfully`);
          } else {
            console.log(`   ⚠️  Product not found in database: ${importProduct.product_id}`);
          }
          
          results.push({
            productId: importProduct.product_id,
            oldUrl: importProduct.image,
            newUrl: newImageUrl
          });
          
          successCount++;
          
        } catch (error) {
          console.log(`   ❌ Error processing ${importProduct.product_id}:`, error);
          results.push({
            productId: importProduct.product_id,
            oldUrl: importProduct.image,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          errorCount++;
        }
      }
      
      console.log('\n🎉 Import images download completed!');
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
      console.log('🌐 You can now access images via: http://localhost:5000/product-images/[filename]');
      
    } catch (error) {
      console.error('❌ Error in import images download process:', error);
    } finally {
      await databaseService.disconnect();
      process.exit(0);
    }
  }
}

// Run the script
if (require.main === module) {
  const downloader = new ImportImageDownloader();
  downloader.downloadImportImages();
}

export { ImportImageDownloader };



