const { databaseService } = require('../../dist/services/database');
const { ProductModel } = require('../../dist/models/Product');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class VercelBlobImageScraper {
  constructor() {
    this.scrapedDir = path.join(__dirname, '../../public/scraped-products-full');
    this.downloadedImages = [];
    this.failedDownloads = [];
    this.totalProducts = 0;
    this.processedProducts = 0;
  }

  async createDirectory() {
    try {
      if (!fs.existsSync(this.scrapedDir)) {
        fs.mkdirSync(this.scrapedDir, { recursive: true });
        console.log(`📁 Created directory: ${this.scrapedDir}`);
      } else {
        console.log(`📁 Directory already exists: ${this.scrapedDir}`);
      }
    } catch (error) {
      console.error('❌ Error creating directory:', error);
      throw error;
    }
  }

  async downloadImage(imageUrl, filename) {
    try {
      console.log(`   📥 Downloading: ${filename}`);
      
      const response = await axios.get(imageUrl, {
        responseType: 'stream',
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const filePath = path.join(this.scrapedDir, filename);
      const writer = fs.createWriteStream(filePath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`   ✅ Downloaded: ${filename}`);
          resolve(filePath);
        });
        writer.on('error', (error) => {
          console.log(`   ❌ Error writing file ${filename}:`, error.message);
          reject(error);
        });
      });

    } catch (error) {
      console.log(`   ❌ Failed to download ${filename}:`, error.message);
      throw error;
    }
  }

  async checkImageExists(imageUrl) {
    try {
      const response = await axios.head(imageUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async scrapeAllImages() {
    try {
      console.log('🚀 Starting Vercel Blob image scraping...');
      
      // Create directory
      await this.createDirectory();
      
      // Connect to database
      await databaseService.connect();
      const productModel = new ProductModel(databaseService.getDatabase());
      
      // Get all products
      const products = await productModel.getAllProducts();
      this.totalProducts = products.length;
      
      console.log(`📊 Found ${this.totalProducts} products to process`);
      
      // Filter products with Vercel Blob URLs
      const productsWithVercelImages = products.filter(p => 
        p.image && p.image.includes('vercel-storage.com')
      );
      
      console.log(`📊 Found ${productsWithVercelImages.length} products with Vercel Blob images`);
      
      // Process each product
      for (const product of productsWithVercelImages) {
        this.processedProducts++;
        console.log(`\n🔍 Processing ${this.processedProducts}/${productsWithVercelImages.length}: ${product.product_id}`);
        console.log(`   Product: ${product.name}`);
        console.log(`   Image URL: ${product.image}`);
        
        try {
          // Extract filename from URL
          const filename = product.image.split('/').pop();
          console.log(`   Navigating to: ${product.image}`);
          
          // Check if image exists
          const exists = await this.checkImageExists(product.image);
          if (!exists) {
            console.log(`   ❌ Image not found or inaccessible`);
            this.failedDownloads.push({
              productId: product.product_id,
              imageUrl: product.image,
              filename: filename,
              reason: 'Image not found or inaccessible'
            });
            continue;
          }
          
          // Download the image
          await this.downloadImage(product.image, filename);
          
          this.downloadedImages.push({
            productId: product.product_id,
            productName: product.name,
            imageUrl: product.image,
            filename: filename,
            localPath: path.join(this.scrapedDir, filename)
          });
          
          // Add a small delay to be respectful to the server
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.log(`   ❌ Error processing ${product.product_id}:`, error.message);
          this.failedDownloads.push({
            productId: product.product_id,
            imageUrl: product.image,
            filename: product.image.split('/').pop(),
            reason: error.message
          });
        }
      }
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Error during scraping:', error);
    } finally {
      await databaseService.disconnect();
      process.exit(0);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📋 VERCEL BLOB IMAGE SCRAPING REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n✅ SUCCESSFULLY DOWNLOADED: ${this.downloadedImages.length}`);
    this.downloadedImages.forEach(item => {
      console.log(`   ${item.productId}: ${item.filename}`);
    });
    
    console.log(`\n❌ FAILED DOWNLOADS: ${this.failedDownloads.length}`);
    this.failedDownloads.forEach(item => {
      console.log(`   ${item.productId}: ${item.filename} - ${item.reason}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY:');
    console.log(`Total products processed: ${this.processedProducts}`);
    console.log(`Successfully downloaded: ${this.downloadedImages.length}`);
    console.log(`Failed downloads: ${this.failedDownloads.length}`);
    console.log(`Success rate: ${((this.downloadedImages.length / this.processedProducts) * 100).toFixed(2)}%`);
    console.log(`Images saved to: ${this.scrapedDir}`);
    console.log('='.repeat(80));
    
    // Save detailed report to file
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalProcessed: this.processedProducts,
        successfulDownloads: this.downloadedImages.length,
        failedDownloads: this.failedDownloads.length,
        successRate: `${((this.downloadedImages.length / this.processedProducts) * 100).toFixed(2)}%`
      },
      downloadedImages: this.downloadedImages,
      failedDownloads: this.failedDownloads,
      scrapedDirectory: this.scrapedDir
    };
    
    const reportPath = path.join(__dirname, '../../vercel-blob-scraping-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }
}

// Run the scraper
const scraper = new VercelBlobImageScraper();
scraper.scrapeAllImages();
