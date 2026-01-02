import { Pool } from 'pg';
import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

class ImageUploaderToVercelBlob {
  private pool: Pool;
  private imagesDir: string;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    this.imagesDir = path.join(__dirname, '../../public/uploads/product-images');
  }

  async uploadAllImages(): Promise<void> {
    try {
      console.log('🚀 Starting image upload to Vercel Blob...');
      
      // Check if Vercel Blob token is configured
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        throw new Error('BLOB_READ_WRITE_TOKEN environment variable is required');
      }

      // Get all image files from the local directory
      const imageFiles = this.getImageFiles();
      console.log(`📦 Found ${imageFiles.length} image files to upload`);

      // Get all products from database
      const products = await this.getAllProducts();
      console.log(`📋 Found ${products.length} products in database`);

      let uploadedCount = 0;
      let updatedCount = 0;
      let errorCount = 0;

      for (const product of products) {
        try {
          if (!product.image || product.image === '/placeholder-product.svg') {
            console.log(`⏭️  Skipping product ${product.name} - no image or placeholder`);
            continue;
          }

          // Check if image file exists locally
          const localImagePath = path.join(this.imagesDir, product.image);
          if (!fs.existsSync(localImagePath)) {
            console.log(`⚠️  Image file not found locally: ${product.image}`);
            continue;
          }

          // Check if image is already a Vercel Blob URL
          if (product.image.startsWith('https://')) {
            console.log(`⏭️  Product ${product.name} already has Vercel Blob URL`);
            continue;
          }

          // Upload image to Vercel Blob
          const imageBuffer = fs.readFileSync(localImagePath);
          const blob = await put(product.image, imageBuffer, {
            access: 'public',
            contentType: this.getContentType(product.image),
          });

          // Update product in database with Vercel Blob URL
          await this.updateProductImage(product.id, blob.url);
          
          uploadedCount++;
          updatedCount++;
          
          console.log(`✅ Uploaded and updated: ${product.name} -> ${blob.url}`);
          
          if (uploadedCount % 10 === 0) {
            console.log(`📊 Progress: ${uploadedCount}/${imageFiles.length} images uploaded...`);
          }

        } catch (error) {
          errorCount++;
          console.error(`❌ Error processing product ${product.name}:`, error);
        }
      }

      console.log(`🎉 Image upload completed!`);
      console.log(`✅ Images uploaded: ${uploadedCount}`);
      console.log(`✅ Products updated: ${updatedCount}`);
      console.log(`❌ Errors: ${errorCount}`);

    } catch (error) {
      console.error('❌ Image upload failed:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  private getImageFiles(): string[] {
    if (!fs.existsSync(this.imagesDir)) {
      return [];
    }

    return fs.readdirSync(this.imagesDir)
      .filter(file => /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(file));
  }

  private async getAllProducts(): Promise<any[]> {
    const result = await this.pool.query(`
      SELECT id, name, image 
      FROM products 
      WHERE image IS NOT NULL AND image != ''
    `);
    return result.rows;
  }

  private async updateProductImage(productId: string, imageUrl: string): Promise<void> {
    await this.pool.query(
      'UPDATE products SET image = $1 WHERE id = $2',
      [imageUrl, productId]
    );
  }

  private getContentType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp'
    };
    return contentTypes[ext] || 'image/png';
  }
}

// Run upload if this script is executed directly
if (require.main === module) {
  const uploader = new ImageUploaderToVercelBlob();
  uploader.uploadAllImages()
    .then(() => {
      console.log('✅ Image upload script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Image upload script failed:', error);
      process.exit(1);
    });
}

export { ImageUploaderToVercelBlob };
