const fs = require('fs');
const path = require('path');
const { databaseService } = require('./dist/services/database');
const { ProductModel } = require('./dist/models/Product');

class ProductOrganizer {
  constructor() {
    this.productsDir = path.join(__dirname, 'organized-products');
    this.scrapedImagesDir = path.join(__dirname, 'public/scraped-products-full');
    this.scrapedImagesDir2 = path.join(__dirname, 'public/scraped-images');
    this.uploadsDir = path.join(__dirname, 'public/uploads/product-images');
  }

  async organizeProducts() {
    try {
      console.log('🚀 Starting product organization...');
      
      // Connect to database
      await databaseService.connect();
      const productModel = new ProductModel(databaseService.getDatabase());
      
      // Get all products
      const products = await productModel.getAllProducts();
      console.log(`📊 Found ${products.length} products to organize`);
      
      // Create main directory
      if (!fs.existsSync(this.productsDir)) {
        fs.mkdirSync(this.productsDir, { recursive: true });
        console.log(`📁 Created main directory: ${this.productsDir}`);
      }
      
      // Process each product
      for (const product of products) {
        await this.createProductDirectory(product);
      }
      
      console.log('🎉 Product organization completed!');
      
    } catch (error) {
      console.error('❌ Error organizing products:', error);
    } finally {
      await databaseService.disconnect();
      process.exit(0);
    }
  }

  async createProductDirectory(product) {
    try {
      // Create safe directory name from product name
      const safeProductName = this.sanitizeDirectoryName(product.full_name || product.name || product.product_id);
      const productDir = path.join(this.productsDir, safeProductName);
      
      console.log(`\n🔍 Processing: ${product.product_id} - ${safeProductName}`);
      
      // Create product directory
      if (!fs.existsSync(productDir)) {
        fs.mkdirSync(productDir, { recursive: true });
        console.log(`   📁 Created directory: ${safeProductName}`);
      }
      
      // Create subdirectories
      const subdirs = ['product-image', 'TDS', 'SDS'];
      for (const subdir of subdirs) {
        const subdirPath = path.join(productDir, subdir);
        if (!fs.existsSync(subdirPath)) {
          fs.mkdirSync(subdirPath, { recursive: true });
          console.log(`   📁 Created subdirectory: ${subdir}`);
        }
      }
      
      // Find and copy product image
      await this.copyProductImage(product, productDir);
      
    } catch (error) {
      console.log(`   ❌ Error processing ${product.product_id}:`, error.message);
    }
  }

  async copyProductImage(product, productDir) {
    try {
      const imageDir = path.join(productDir, 'product-image');
      
      // Try to find the image in different locations
      const possibleImagePaths = [
        // From scraped-products-full (most recent)
        path.join(this.scrapedImagesDir, `${product.product_id.toLowerCase()}.png`),
        path.join(this.scrapedImagesDir, `${product.product_id}.png`),
        // From scraped-images
        path.join(this.scrapedImagesDir2, `${product.product_id.toLowerCase()}.png`),
        path.join(this.scrapedImagesDir2, `${product.product_id}.png`),
        // From uploads
        path.join(this.uploadsDir, `${product.product_id.toLowerCase()}.png`),
        path.join(this.uploadsDir, `${product.product_id}.png`),
      ];
      
      let imageFound = false;
      for (const imagePath of possibleImagePaths) {
        if (fs.existsSync(imagePath)) {
          const destPath = path.join(imageDir, `${product.product_id}.png`);
          fs.copyFileSync(imagePath, destPath);
          console.log(`   ✅ Copied image: ${product.product_id}.png`);
          imageFound = true;
          break;
        }
      }
      
      if (!imageFound) {
        console.log(`   ⚠️  No image found for ${product.product_id}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error copying image for ${product.product_id}:`, error.message);
    }
  }

  sanitizeDirectoryName(name) {
    if (!name) return 'unknown-product';
    
    // Remove or replace invalid characters for directory names
    return name
      .replace(/[<>:"/\\|?*]/g, '-')  // Replace invalid chars with dash
      .replace(/\s+/g, ' ')           // Normalize spaces
      .trim()                         // Remove leading/trailing spaces
      .substring(0, 100);             // Limit length
  }
}

// Run the organizer
const organizer = new ProductOrganizer();
organizer.organizeProducts();



