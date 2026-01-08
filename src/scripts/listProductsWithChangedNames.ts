import axios from 'axios';

const API_BASE_URL = 'https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api';

// Products we know we updated
const PRODUCTS_WE_UPDATED = [
  // From updateProductNamesViaAPI.ts
  'IC933', 'IC934', 'IC946', 'MC739', 'MC722', 'C130', 'C150', 'C331', 'FRP', 'I1000',
  'OA4', 'OA75', 'OA99', 'OSA', 'OS24', 'R160', 'R221', 'R519', 'R529', 'FC-CAR',
  'S228', 'OS2', 'OS31', 'OS35', 'OS37', 'OS45', 'OS55', 'OS61', 'T220', 'T215',
  'T350', 'T461', 'T464', 'T500', 'T600', 'T715', 'T900', 'T950', 'T970',
  
  // From updateNewProductNames.ts
  '81-0389', 'R190', 'T205', 'T305', 'T310', 'T449', 'T465', 'T532', 'W700', 'CA2400',
  'CA1500', 'M-C283', 'MC736', 'M-R478', 'M-S750', 'TAC-735R', 'TAC-OS7', 'TAC-OS74',
  'TAC-R777', 'TAC-R750', 'TC471', 'T-OS150', 'T-R682', 'C-S538', 'R-OSA',
  
  // Similar products we updated
  'M-OA755', 'C-OS55', 'C-T500', 'R-T600'
];

async function listProductsWithChangedNames() {
  console.log('📋 Listing products we changed names for...\n');

  try {
    const response = await axios.get(`${API_BASE_URL}/products`, {
      timeout: 30000
    });
    
    const allProducts = Array.isArray(response.data) ? response.data : [];
    
    const changedProducts: Array<{
      product_id: string;
      name: string;
      full_name: string;
    }> = [];

    // Check each product we know we updated
    for (const productId of PRODUCTS_WE_UPDATED) {
      const product = allProducts.find(
        (p: any) => p.product_id?.toUpperCase() === productId.toUpperCase()
      );

      if (product) {
        const name = product.name || '';
        const fullName = product.full_name || '';
        
        // Check if it has the full name format (with "–")
        if (name.includes('–') || fullName.includes('–')) {
          changedProducts.push({
            product_id: product.product_id,
            name: name,
            full_name: fullName
          });
        }
      }
    }

    console.log('='.repeat(80));
    console.log('PRODUCTS WE CHANGED NAMES FOR');
    console.log('='.repeat(80));
    console.log(`\nTotal: ${changedProducts.length} products\n`);

    // Group by update script
    console.log('📝 Detailed list:\n');
    changedProducts.forEach((p, index) => {
      console.log(`${index + 1}. ${p.product_id}`);
      console.log(`   "${p.name || p.full_name}"`);
      console.log('');
    });

    // Simple list
    console.log('='.repeat(80));
    console.log('SIMPLE LIST (comma-separated):');
    console.log('='.repeat(80));
    console.log(changedProducts.map(p => p.product_id).join(', '));

    // Save to file
    const fs = require('fs');
    fs.writeFileSync(
      'products_with_changed_names.txt',
      changedProducts.map(p => p.product_id).join(', ')
    );

    console.log('\n' + '='.repeat(80));
    console.log('✅ List saved to: products_with_changed_names.txt');
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

listProductsWithChangedNames().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

