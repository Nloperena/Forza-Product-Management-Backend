import { Database } from 'sqlite3';
import path from 'path';

class ImagePathFixerSQLite {
  private db: Database;

  constructor() {
    const dbPath = path.join(__dirname, '../../data/products.db');
    this.db = new Database(dbPath);
  }

  async fixImagePaths(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔧 Starting image path fix for SQLite...');
        
        // Get all products with image paths that need fixing
        this.db.all(`
          SELECT id, image 
          FROM products 
          WHERE image LIKE '/product-images/%' OR image LIKE 'product-images/%'
        `, (err, products: any[]) => {
          if (err) {
            console.error('❌ Error querying products:', err);
            reject(err);
            return;
          }
          
          console.log(`📦 Found ${products.length} products with incorrect image paths`);
          
          if (products.length === 0) {
            console.log('✅ No products need fixing!');
            this.db.close();
            resolve();
            return;
          }
          
          let fixedCount = 0;
          let completed = 0;
          
          for (const product of products) {
            let fixedImage = product.image;
            
            // Remove leading /product-images/ or product-images/ prefix
            if (fixedImage.startsWith('/product-images/')) {
              fixedImage = fixedImage.substring('/product-images/'.length);
            } else if (fixedImage.startsWith('product-images/')) {
              fixedImage = fixedImage.substring('product-images/'.length);
            }
            
            // Update the product with the fixed image path
            this.db.run('UPDATE products SET image = ? WHERE id = ?', [fixedImage, product.id], (err) => {
              if (err) {
                console.error(`❌ Error updating product ${product.id}:`, err);
              } else {
                fixedCount++;
              }
              
              completed++;
              
              if (completed % 20 === 0) {
                console.log(`✅ Processed ${completed}/${products.length} products...`);
              }
              
              if (completed === products.length) {
                console.log(`🎉 Image path fix completed!`);
                console.log(`✅ Fixed: ${fixedCount} products`);
                
                // Verify the fix
                this.verifyFix(() => {
                  this.db.close();
                  resolve();
                });
              }
            });
          }
        });
        
      } catch (error) {
        console.error('❌ Image path fix failed:', error);
        this.db.close();
        reject(error);
      }
    });
  }

  private verifyFix(callback: () => void): void {
    console.log('🔍 Verifying image path fix...');
    
    // Check for any remaining incorrect paths
    this.db.get(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE image LIKE '/product-images/%' OR image LIKE 'product-images/%'
    `, (err, result: any) => {
      if (err) {
        console.error('❌ Error verifying fix:', err);
        callback();
        return;
      }
      
      const incorrectCount = result.count;
      
      if (incorrectCount === 0) {
        console.log('✅ All image paths have been fixed!');
      } else {
        console.log(`⚠️  ${incorrectCount} products still have incorrect image paths`);
      }
      
      // Show some sample fixed paths
      this.db.all(`
        SELECT product_id, name, image 
        FROM products 
        WHERE image IS NOT NULL AND image != ''
        ORDER BY updated_at DESC 
        LIMIT 5
      `, (err, samples: any[]) => {
        if (err) {
          console.error('❌ Error getting samples:', err);
        } else {
          console.log('📋 Sample fixed image paths:');
          samples.forEach((row: any, index: number) => {
            console.log(`  ${index + 1}. ${row.name}: ${row.image}`);
          });
        }
        callback();
      });
    });
  }
}

// Run fix if this script is executed directly
if (require.main === module) {
  const fixer = new ImagePathFixerSQLite();
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

export { ImagePathFixerSQLite };
