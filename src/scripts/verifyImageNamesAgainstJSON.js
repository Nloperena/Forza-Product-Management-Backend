const { databaseService } = require('../../dist/services/database');
const { ProductModel } = require('../../dist/models/Product');
const fs = require('fs');
const path = require('path');

class ImageNameVerifier {
  constructor() {
    this.jsonData = null;
    this.mismatches = [];
    this.matches = [];
    this.notFound = [];
  }

  loadJSONData() {
    try {
      const jsonPath = path.join(__dirname, '../../backend-import.json');
      const jsonContent = fs.readFileSync(jsonPath, 'utf8');
      this.jsonData = JSON.parse(jsonContent);
      console.log(`📄 Loaded JSON data with ${this.jsonData.length} products`);
    } catch (error) {
      console.error('❌ Error loading JSON data:', error);
      throw error;
    }
  }

  getExpectedImageFilename(productId) {
    const product = this.jsonData.find(p => p.product_id === productId);
    if (!product) {
      return null;
    }
    
    // Extract filename from the image URL
    const imageUrl = product.image;
    if (!imageUrl) {
      return null;
    }
    
    // Get the filename from the URL
    const filename = imageUrl.split('/').pop();
    return filename;
  }

  getExpectedVercelFilename(productId) {
    // Based on the product ID, what should the Vercel filename be?
    // This should match what was uploaded to Vercel Blob
    return `${productId.toLowerCase()}.png`;
  }

  async verifyImageNames() {
    try {
      console.log('🔍 Verifying image names against JSON data...');
      
      // Load JSON data
      this.loadJSONData();
      
      // Connect to database
      await databaseService.connect();
      const productModel = new ProductModel(databaseService.getPool());
      
      // Get all products from database
      const products = await productModel.getAllProducts();
      console.log(`📊 Found ${products.length} products in database`);
      
      // Check each product
      for (const product of products) {
        console.log(`\n🔍 Checking ${product.product_id}: ${product.name}`);
        
        // Get expected filenames
        const expectedJsonFilename = this.getExpectedImageFilename(product.product_id);
        const expectedVercelFilename = this.getExpectedVercelFilename(product.product_id);
        
        console.log(`   Expected JSON filename: ${expectedJsonFilename || 'N/A'}`);
        console.log(`   Expected Vercel filename: ${expectedVercelFilename}`);
        
        if (!product.image) {
          console.log(`   ❌ No image URL in database`);
          this.notFound.push({
            productId: product.product_id,
            issue: 'No image URL in database'
          });
          continue;
        }
        
        // Extract current filename from database
        const currentFilename = product.image.split('/').pop();
        console.log(`   Current database filename: ${currentFilename}`);
        
        // Check if it's a Vercel Blob URL
        if (product.image.includes('vercel-storage.com')) {
          // For Vercel Blob URLs, check against expected Vercel filename
          if (currentFilename === expectedVercelFilename) {
            console.log(`   ✅ Vercel filename matches expected`);
            this.matches.push({
              productId: product.product_id,
              type: 'vercel',
              expected: expectedVercelFilename,
              actual: currentFilename
            });
          } else {
            console.log(`   ❌ Vercel filename mismatch`);
            this.mismatches.push({
              productId: product.product_id,
              type: 'vercel',
              expected: expectedVercelFilename,
              actual: currentFilename,
              issue: 'Vercel filename does not match expected format'
            });
          }
        } else if (product.image.includes('forzabuilt.com')) {
          // For WordPress URLs, check against JSON
          if (currentFilename === expectedJsonFilename) {
            console.log(`   ✅ WordPress filename matches JSON`);
            this.matches.push({
              productId: product.product_id,
              type: 'wordpress',
              expected: expectedJsonFilename,
              actual: currentFilename
            });
          } else {
            console.log(`   ❌ WordPress filename mismatch`);
            this.mismatches.push({
              productId: product.product_id,
              type: 'wordpress',
              expected: expectedJsonFilename,
              actual: currentFilename,
              issue: 'WordPress filename does not match JSON'
            });
          }
        } else if (product.image.startsWith('/scraped-images/')) {
          // For local scraped images
          if (currentFilename === expectedVercelFilename) {
            console.log(`   ✅ Local filename matches expected format`);
            this.matches.push({
              productId: product.product_id,
              type: 'local',
              expected: expectedVercelFilename,
              actual: currentFilename
            });
          } else {
            console.log(`   ❌ Local filename mismatch`);
            this.mismatches.push({
              productId: product.product_id,
              type: 'local',
              expected: expectedVercelFilename,
              actual: currentFilename,
              issue: 'Local filename does not match expected format'
            });
          }
        } else {
          console.log(`   ⚠️  Unknown image URL type: ${product.image}`);
          this.notFound.push({
            productId: product.product_id,
            issue: `Unknown image URL type: ${product.image}`
          });
        }
      }
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Error verifying image names:', error);
    } finally {
      await databaseService.disconnect();
      process.exit(0);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📋 IMAGE NAME VERIFICATION REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n✅ MATCHES: ${this.matches.length}`);
    this.matches.forEach(match => {
      console.log(`   ${match.productId} (${match.type}): ${match.actual}`);
    });
    
    console.log(`\n❌ MISMATCHES: ${this.mismatches.length}`);
    this.mismatches.forEach(mismatch => {
      console.log(`   ${mismatch.productId} (${mismatch.type}):`);
      console.log(`     Expected: ${mismatch.expected}`);
      console.log(`     Actual: ${mismatch.actual}`);
      console.log(`     Issue: ${mismatch.issue}`);
    });
    
    console.log(`\n⚠️  NOT FOUND/ISSUES: ${this.notFound.length}`);
    this.notFound.forEach(item => {
      console.log(`   ${item.productId}: ${item.issue}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY:');
    console.log(`Total products checked: ${this.matches.length + this.mismatches.length + this.notFound.length}`);
    console.log(`Matches: ${this.matches.length}`);
    console.log(`Mismatches: ${this.mismatches.length}`);
    console.log(`Issues: ${this.notFound.length}`);
    console.log('='.repeat(80));
    
    // Save detailed report to file
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.matches.length + this.mismatches.length + this.notFound.length,
        matches: this.matches.length,
        mismatches: this.mismatches.length,
        issues: this.notFound.length
      },
      matches: this.matches,
      mismatches: this.mismatches,
      notFound: this.notFound
    };
    
    const reportPath = path.join(__dirname, '../../image-verification-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }
}

// Run the verification
const verifier = new ImageNameVerifier();
verifier.verifyImageNames();



