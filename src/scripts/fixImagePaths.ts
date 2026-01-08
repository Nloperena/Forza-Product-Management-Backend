import { Pool } from 'pg';

class ImagePathFixer {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }

  async fixImagePaths(): Promise<void> {
    try {
      console.log('🔧 Starting image path fix...');
      
      // Get all products with image paths that need fixing
      const result = await this.pool.query(`
        SELECT id, image 
        FROM products 
        WHERE image LIKE '/product-images/%' OR image LIKE 'product-images/%'
      `);
      
      console.log(`📦 Found ${result.rows.length} products with incorrect image paths`);
      
      let fixedCount = 0;
      
      for (const row of result.rows) {
        let fixedImage = row.image;
        
        // Remove leading /product-images/ or product-images/ prefix
        if (fixedImage.startsWith('/product-images/')) {
          fixedImage = fixedImage.substring('/product-images/'.length);
        } else if (fixedImage.startsWith('product-images/')) {
          fixedImage = fixedImage.substring('product-images/'.length);
        }
        
        // Update the product with the fixed image path
        await this.pool.query(
          'UPDATE products SET image = $1 WHERE id = $2',
          [fixedImage, row.id]
        );
        
        fixedCount++;
        
        if (fixedCount % 20 === 0) {
          console.log(`✅ Fixed ${fixedCount}/${result.rows.length} products...`);
        }
      }
      
      console.log(`🎉 Image path fix completed!`);
      console.log(`✅ Fixed: ${fixedCount} products`);
      
      // Verify the fix
      await this.verifyFix();
      
    } catch (error) {
      console.error('❌ Image path fix failed:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  private async verifyFix(): Promise<void> {
    console.log('🔍 Verifying image path fix...');
    
    // Check for any remaining incorrect paths
    const incorrectResult = await this.pool.query(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE image LIKE '/product-images/%' OR image LIKE 'product-images/%'
    `);
    
    const incorrectCount = parseInt(incorrectResult.rows[0].count);
    
    if (incorrectCount === 0) {
      console.log('✅ All image paths have been fixed!');
    } else {
      console.log(`⚠️  ${incorrectCount} products still have incorrect image paths`);
    }
    
    // Show some sample fixed paths
    const sampleResult = await this.pool.query(`
      SELECT product_id, name, image 
      FROM products 
      WHERE image IS NOT NULL AND image != ''
      ORDER BY updated_at DESC 
      LIMIT 5
    `);
    
    console.log('📋 Sample fixed image paths:');
    sampleResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.name}: ${row.image}`);
    });
  }
}

// Run fix if this script is executed directly
if (require.main === module) {
  const fixer = new ImagePathFixer();
  fixer.fixImagePaths()
    .then(() => {
      console.log('✅ Image path fix script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Image path fix script failed:', error);
      process.exit(1);
    });
}

export { ImagePathFixer };
