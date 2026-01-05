import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { URL } from 'url';

interface ImageDownloadResult {
  success: boolean;
  localPath?: string;
  vercelUrl?: string;
  error?: string;
}

class ImageScraper {
  private downloadDir: string;
  private vercelToken: string;

  constructor() {
    this.downloadDir = path.join(__dirname, '../../temp-images');
    this.vercelToken = process.env.VERCEL_BLOB_TOKEN || '';
    
    // Create download directory if it doesn't exist
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  private async downloadImage(url: string, filename: string): Promise<ImageDownloadResult> {
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

  private async uploadToVercel(localPath: string, filename: string): Promise<ImageDownloadResult> {
    try {
      const formData = new FormData();
      const fileBuffer = fs.readFileSync(localPath);
      const blob = new Blob([fileBuffer]);
      formData.append('file', blob, filename);

      const response = await fetch('https://api.vercel.com/blob', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.vercelToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Vercel upload failed: ${response.statusText}`);
      }

      const result = await response.json() as { url: string };
      
      return {
        success: true,
        vercelUrl: result.url
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      };
    }
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

  async scrapeAndUploadImages(): Promise<void> {
    try {
      console.log('🖼️  Starting image scraping and upload process...');
      
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
          
          // Upload to Vercel
          console.log(`   📤 Uploading to Vercel...`);
          const uploadResult = await this.uploadToVercel(downloadResult.localPath!, filename);
          
          if (!uploadResult.success) {
            console.log(`   ❌ Vercel upload failed: ${uploadResult.error}`);
            results.push({
              productId: product.product_id,
              oldUrl: product.image,
              error: uploadResult.error
            });
            errorCount++;
            continue;
          }
          
          console.log(`   ✅ Uploaded to Vercel: ${uploadResult.vercelUrl}`);
          
          // Update database
          console.log(`   💾 Updating database...`);
          await productModel.updateProduct(product.id, {
            image: uploadResult.vercelUrl
          });
          
          console.log(`   ✅ Database updated successfully`);
          
          results.push({
            productId: product.product_id,
            oldUrl: product.image,
            newUrl: uploadResult.vercelUrl
          });
          
          successCount++;
          
          // Clean up local file
          if (downloadResult.localPath && fs.existsSync(downloadResult.localPath)) {
            fs.unlinkSync(downloadResult.localPath);
          }
          
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
      
      // Clean up download directory
      if (fs.existsSync(this.downloadDir)) {
        fs.rmSync(this.downloadDir, { recursive: true, force: true });
      }
      
      console.log('\n🎉 Image scraping and upload completed!');
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
      
    } catch (error) {
      console.error('❌ Error in image scraping process:', error);
    } finally {
      await databaseService.disconnect();
      process.exit(0);
    }
  }
}

// Run the script
if (require.main === module) {
  const scraper = new ImageScraper();
  scraper.scrapeAndUploadImages();
}

export { ImageScraper };
