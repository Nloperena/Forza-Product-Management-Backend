import * as fs from 'fs';
import * as path from 'path';
import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';

const JSON_FILE_PATH = path.join(__dirname, '../../data/forza_products_organized.json');

async function verifyJsonUsage() {
  console.log('🔍 Verifying Backend JSON Usage...\n');
  
  // 1. Check if JSON file exists
  const jsonPath = path.resolve(JSON_FILE_PATH);
  console.log(`📄 JSON File Path: ${jsonPath}`);
  console.log(`   Exists: ${fs.existsSync(jsonPath) ? '✅ YES' : '❌ NO'}\n`);
  
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ JSON file not found! Backend cannot use it.');
    return;
  }
  
  // 2. Load and verify JSON structure
  const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
  const jsonData = JSON.parse(jsonContent);
  
  console.log('📊 JSON Structure:');
  if (jsonData.forza_products_organized) {
    console.log('   ✅ Has "forza_products_organized" structure');
    const organized = jsonData.forza_products_organized;
    
    // Count Marine products
    let marineCount = 0;
    let compositeCount = 0;
    const marineImages: string[] = [];
    const compositeImages: string[] = [];
    
    for (const brandKey in organized) {
      const brand = organized[brandKey];
      if (brand.products) {
        for (const industryKey in brand.products) {
          const industry = brand.products[industryKey];
          if (industry.products) {
            industry.products.forEach((product: any) => {
              if (product.industry === 'marine_industry') {
                marineCount++;
                if (product.image) marineImages.push(`${product.product_id}: ${product.image}`);
              } else if (product.industry === 'composites_industry') {
                compositeCount++;
                if (product.image) compositeImages.push(`${product.product_id}: ${product.image}`);
              }
            });
          }
        }
      }
    }
    
    console.log(`   📦 Marine Products: ${marineCount}`);
    console.log(`   📦 Composite Products: ${compositeCount}\n`);
    
    // 3. Show sample Marine images
    console.log('🌊 Sample Marine Product Images from JSON:');
    marineImages.slice(0, 5).forEach(img => console.log(`   ${img}`));
    if (marineImages.length > 5) console.log(`   ... and ${marineImages.length - 5} more\n`);
    
    // 4. Show sample Composite images
    console.log('🔧 Sample Composite Product Images from JSON:');
    compositeImages.slice(0, 5).forEach(img => console.log(`   ${img}`));
    if (compositeImages.length > 5) console.log(`   ... and ${compositeImages.length - 5} more\n`);
    
    // 5. Check database connection and compare
    try {
      console.log('🔌 Connecting to database...');
      await databaseService.connect();
      await databaseService.initializeDatabase();
      
      const productModel = databaseService.isPostgres()
        ? new ProductModel()
        : new ProductModel(databaseService.getDatabase());
      
      const dbProducts = await productModel.getAllProducts();
      const marineDbProducts = dbProducts.filter(p => p.industry === 'marine_industry');
      const compositeDbProducts = dbProducts.filter(p => p.industry === 'composites_industry');
      
      console.log(`\n📊 Database Status:`);
      console.log(`   Marine Products in DB: ${marineDbProducts.length}`);
      console.log(`   Composite Products in DB: ${compositeDbProducts.length}\n`);
      
      // Compare a few products
      console.log('🔍 Comparing JSON vs Database (sample):');
      let matches = 0;
      let mismatches = 0;
      
      const sampleProducts = [...marineDbProducts.slice(0, 3), ...compositeDbProducts.slice(0, 3)];
      
      for (const dbProduct of sampleProducts) {
        const findInJson = (obj: any): any => {
          if (Array.isArray(obj)) {
            for (const item of obj) {
              if (item.product_id === dbProduct.product_id) return item;
              const found = findInJson(item);
              if (found) return found;
            }
          } else if (obj && typeof obj === 'object') {
            if (obj.product_id === dbProduct.product_id) return obj;
            for (const key in obj) {
              const found = findInJson(obj[key]);
              if (found) return found;
            }
          }
          return null;
        };
        
        const jsonProduct = findInJson(jsonData);
        if (jsonProduct && jsonProduct.image) {
          if (dbProduct.image === jsonProduct.image) {
            matches++;
            console.log(`   ✅ ${dbProduct.product_id}: MATCH`);
          } else {
            mismatches++;
            console.log(`   ❌ ${dbProduct.product_id}: MISMATCH`);
            console.log(`      DB:   ${dbProduct.image}`);
            console.log(`      JSON: ${jsonProduct.image}`);
          }
        }
      }
      
      console.log(`\n📈 Summary: ${matches} matches, ${mismatches} mismatches in sample`);
      
      if (mismatches > 0) {
        console.log('\n⚠️  WARNING: Database is out of sync with JSON!');
        console.log('   Run the sync endpoint to update the database.');
      } else {
        console.log('\n✅ Database appears to be in sync with JSON!');
      }
      
    } catch (error) {
      console.error('❌ Error checking database:', error);
    } finally {
      if (databaseService.isPostgres()) {
        const pool = (databaseService as any).pool;
        if (pool) await pool.end();
      }
    }
  } else {
    console.log('❌ JSON does not have expected structure');
  }
}

if (require.main === module) {
  verifyJsonUsage()
    .then(() => {
      console.log('\n🎉 Verification completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Verification failed:', error);
      process.exit(1);
    });
}

export { verifyJsonUsage };

