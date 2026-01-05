import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';
import fs from 'fs';
import path from 'path';

interface UploadResult {
  success: boolean;
  vercelUrl?: string;
  error?: string;
}

class VercelBlobUploader {
  private vercelToken: string;
  private localImagesDir: string;

  constructor() {
    this.vercelToken = process.env.VERCEL_BLOB_TOKEN || process.env.BLOB_READ_WRITE_TOKEN || '';
    this.localImagesDir = path.join(__dirname, '../../public/scraped-images');
    
    if (!this.vercelToken) {
      throw new Error('VERCEL_BLOB_TOKEN or BLOB_READ_WRITE_TOKEN environment variable is required');
    }
  }

  private async uploadToVercelBlob(localPath: string, filename: string): Promise<UploadResult> {
    try {
      const fileBuffer = fs.readFileSync(localPath);
      const formData = new FormData();
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
        const errorText = await response.text();
        throw new Error(`Vercel upload failed: ${response.status} ${response.statusText} - ${errorText}`);
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

  async uploadAllImagesToVercel(): Promise<void> {
    try {
      console.log('☁️  Starting Vercel Blob upload process...');
      
      if (!this.vercelToken) {
        console.error('❌ VERCEL_BLOB_TOKEN environment variable is required');
        console.log('💡 Set it in your .env file or environment variables');
        return;
      }
      
      // Connect to database
      await databaseService.connect();
      const productModel = new ProductModel(databaseService.getDatabase());
      
      // Get all products with local images
      const products = await productModel.getAllProducts();
      const productsWithLocalImages = products.filter(p => 
        p.image && p.image.startsWith('/scraped-images/')
      );
      
      console.log(`📊 Found ${productsWithLocalImages.length} products with local images`);
      
      if (productsWithLocalImages.length === 0) {
        console.log('ℹ️  No products with local images found');
        return;
      }
      
      let successCount = 0;
      let errorCount = 0;
      const results: Array<{productId: string, oldUrl: string, newUrl?: string, error?: string}> = [];
      
      for (const product of productsWithLocalImages) {
        if (!product.image) continue;
        
        console.log(`\n📤 Processing ${product.product_id}: ${product.name}`);
        console.log(`   Current URL: ${product.image}`);
        
        try {
          // Extract filename from current path
          const filename = path.basename(product.image);
          const localPath = path.join(this.localImagesDir, filename);
          
          // Check if local file exists
          if (!fs.existsSync(localPath)) {
            console.log(`   ⚠️  Local file not found: ${localPath}`);
            results.push({
              productId: product.product_id,
              oldUrl: product.image,
              error: 'Local file not found'
            });
            errorCount++;
            continue;
          }
          
          console.log(`   📁 Local file: ${localPath}`);
          console.log(`   ☁️  Uploading to Vercel Blob...`);
          
          const uploadResult = await this.uploadToVercelBlob(localPath, filename);
          
          if (!uploadResult.success) {
            console.log(`   ❌ Upload failed: ${uploadResult.error}`);
            results.push({
              productId: product.product_id,
              oldUrl: product.image,
              error: uploadResult.error
            });
            errorCount++;
            continue;
          }
          
          console.log(`   ✅ Uploaded successfully: ${uploadResult.vercelUrl}`);
          
          // Update database with Vercel URL
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
      
      console.log('\n🎉 Vercel Blob upload completed!');
      console.log(`✅ Successfully uploaded: ${successCount} images`);
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
      
      console.log('\n🌐 All images are now hosted on Vercel Blob storage!');
      console.log('🚀 Your app is ready for production deployment.');
      
    } catch (error) {
      console.error('❌ Error in Vercel Blob upload process:', error);
    } finally {
      await databaseService.disconnect();
      process.exit(0);
    }
  }
}

// Run the script
if (require.main === module) {
  const uploader = new VercelBlobUploader();
  uploader.uploadAllImagesToVercel();
}

export { VercelBlobUploader };
