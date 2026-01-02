import axios from 'axios';
import fs from 'fs';

const API_BASE_URL = 'https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api';
const CSV_FILE_PATH = 'C:\\Users\\nimro\\Downloads\\Chemistries Products for Website Database v3(Use This Nico - Chemistries).csv';

async function generateLists() {
  console.log('📋 Generating product lists...\n');

  // List 1: Products without full names
  console.log('='.repeat(80));
  console.log('LIST 1: PRODUCTS WITHOUT FULL NAMES');
  console.log('='.repeat(80));
  
  try {
    const response = await axios.get(`${API_BASE_URL}/products`, {
      timeout: 30000
    });
    
    const allProducts = Array.isArray(response.data) ? response.data : [];
    
    const productsWithoutFullNames: string[] = [];

    for (const product of allProducts) {
      const name = product.name || '';
      const fullName = product.full_name || '';
      
      const hasFullNameFormat = name.includes('–') || fullName.includes('–');
      const isJustBrandName = name.match(/^(ForzaBOND®|ForzaSEAL®|ForzaTAPE®)\s*[A-Z0-9-]+$/i);
      const isJustProductId = name === product.product_id || fullName === product.product_id;
      
      if (!hasFullNameFormat || isJustBrandName || isJustProductId) {
        productsWithoutFullNames.push(product.product_id || 'N/A');
      }
    }

    console.log(`\nTotal: ${productsWithoutFullNames.length} products\n`);
    console.log(productsWithoutFullNames.join(', '));
    console.log('\n');

    // List 2: Products with chemistries we changed
    console.log('='.repeat(80));
    console.log('LIST 2: PRODUCTS WITH CHEMISTRIES WE CHANGED');
    console.log('='.repeat(80));
    
    // Read CSV to get chemistry mappings
    const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const lines = csvContent.split('\n');
    const chemistryMap = new Map<string, { chemistry: string; industry: string }>();
    
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line === '') continue;

      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      if (parts.length < 3) continue;

      const industry = parts[0];
      const productId = parts[1];
      const chemistry = parts[2];

      if (!productId || productId === 'N/A' || productId === '' || !chemistry || chemistry === '') {
        continue;
      }

      chemistryMap.set(productId.toUpperCase(), { chemistry, industry });
    }

    // Find products in database that have chemistries from CSV
    const productsWithChemistries: Array<{ product_id: string; chemistry: string; industry: string }> = [];
    
    for (const product of allProducts) {
      const productId = product.product_id?.toUpperCase();
      if (!productId) continue;
      
      const csvData = chemistryMap.get(productId);
      if (csvData) {
        // Check if product has chemistry set
        if (product.chemistry) {
          productsWithChemistries.push({
            product_id: product.product_id,
            chemistry: product.chemistry,
            industry: csvData.industry
          });
        }
      }
    }

    console.log(`\nTotal: ${productsWithChemistries.length} products\n`);
    
    // Group by chemistry
    const byChemistry = new Map<string, string[]>();
    productsWithChemistries.forEach(p => {
      if (!byChemistry.has(p.chemistry)) {
        byChemistry.set(p.chemistry, []);
      }
      byChemistry.get(p.chemistry)!.push(p.product_id);
    });

    // Print grouped by chemistry
    byChemistry.forEach((productIds, chemistry) => {
      console.log(`\n${chemistry} (${productIds.length} products):`);
      console.log(productIds.join(', '));
    });

    // Also print simple list
    console.log('\n' + '='.repeat(80));
    console.log('SIMPLE LIST (all products with chemistries):');
    console.log('='.repeat(80));
    console.log(productsWithChemistries.map(p => p.product_id).join(', '));

    // Save to files
    fs.writeFileSync(
      'products_without_full_names.txt',
      productsWithoutFullNames.join(', ')
    );
    
    fs.writeFileSync(
      'products_with_chemistries.txt',
      productsWithChemistries.map(p => p.product_id).join(', ')
    );

    console.log('\n' + '='.repeat(80));
    console.log('✅ Lists saved to files:');
    console.log('   - products_without_full_names.txt');
    console.log('   - products_with_chemistries.txt');
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

generateLists().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

