import * as fs from 'fs';
import * as path from 'path';

const CURRENT_JSON_PATH = path.join(__dirname, '../../data/forza_products_organized.json');
const BACKUP_JSON_PATH = path.join(__dirname, '../../data/forza_products_organized.json.bak');

interface Product {
  product_id: string;
  benefits?: string[];
  technical?: Array<{
    property: string;
    value: string;
    unit?: string;
  }>;
  [key: string]: any;
}

function findProductInJSON(productId: string, obj: any): Product | null {
  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (item.product_id === productId) return item;
      const found = findProductInJSON(productId, item);
      if (found) return found;
    }
  } else if (obj && typeof obj === 'object') {
    if (obj.product_id === productId) return obj;
    for (const key in obj) {
      const found = findProductInJSON(productId, obj[key]);
      if (found) return found;
    }
  }
  return null;
}

function updateProductsInSection(section: any, backupData: any, stats: { updated: number; skipped: number }): void {
  if (Array.isArray(section)) {
    section.forEach((product: Product) => {
      if (product.product_id) {
        const backupProduct = findProductInJSON(product.product_id, backupData);
        if (backupProduct) {
          let hasChanges = false;

          // Copy benefits if backup has them and they're not empty
          if (backupProduct.benefits && Array.isArray(backupProduct.benefits) && backupProduct.benefits.length > 0) {
            if (!product.benefits || product.benefits.length === 0 || 
                JSON.stringify(product.benefits) !== JSON.stringify(backupProduct.benefits)) {
              product.benefits = backupProduct.benefits;
              hasChanges = true;
            }
          }

          // Copy technical if backup has them and they're not empty
          if (backupProduct.technical && Array.isArray(backupProduct.technical) && backupProduct.technical.length > 0) {
            if (!product.technical || product.technical.length === 0 ||
                JSON.stringify(product.technical) !== JSON.stringify(backupProduct.technical)) {
              product.technical = backupProduct.technical;
              hasChanges = true;
            }
          }

          if (hasChanges) {
            console.log(`✅ Restored benefits/technical for ${product.product_id}`);
            stats.updated++;
          } else {
            stats.skipped++;
          }
        }
      }
    });
  } else if (typeof section === 'object' && section !== null) {
    Object.values(section).forEach((value: any) => {
      updateProductsInSection(value, backupData, stats);
    });
  }
}

async function restoreBenefitsAndTechnical() {
  console.log('🔄 Restoring benefits and technical data from backup...\n');

  // Check if files exist
  if (!fs.existsSync(CURRENT_JSON_PATH)) {
    console.error(`❌ Current JSON not found at ${CURRENT_JSON_PATH}`);
    return;
  }

  if (!fs.existsSync(BACKUP_JSON_PATH)) {
    console.error(`❌ Backup JSON not found at ${BACKUP_JSON_PATH}`);
    return;
  }

  // Read both files
  console.log('📄 Reading current JSON...');
  const currentData = JSON.parse(fs.readFileSync(CURRENT_JSON_PATH, 'utf-8'));

  console.log('📄 Reading backup JSON...');
  const backupData = JSON.parse(fs.readFileSync(BACKUP_JSON_PATH, 'utf-8'));

  const stats = { updated: 0, skipped: 0 };

  // Process the JSON structure
  if (currentData.forza_products_organized) {
    const organized = currentData.forza_products_organized;
    
    for (const brandKey in organized) {
      const brand = organized[brandKey];
      if (brand.products) {
        for (const industryKey in brand.products) {
          const industry = brand.products[industryKey];
          if (industry.products) {
            console.log(`\n📦 Processing ${brandKey} > ${industryKey}...`);
            updateProductsInSection(industry.products, backupData, stats);
          }
        }
      }
    }
  }

  // Save updated JSON
  if (stats.updated > 0) {
    fs.writeFileSync(CURRENT_JSON_PATH, JSON.stringify(currentData, null, 2), 'utf-8');
    console.log(`\n📊 Summary:`);
    console.log(`✅ Updated: ${stats.updated} products`);
    console.log(`⏭️  Skipped: ${stats.skipped} products (already had data or no backup data)`);
    console.log(`💾 JSON file saved to: ${CURRENT_JSON_PATH}`);
  } else {
    console.log(`\n✅ No updates needed - all products already have benefits/technical data`);
  }
}

if (require.main === module) {
  restoreBenefitsAndTechnical()
    .then(() => {
      console.log('\n🎉 Restore completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Restore failed:', error);
      process.exit(1);
    });
}

export { restoreBenefitsAndTechnical };






