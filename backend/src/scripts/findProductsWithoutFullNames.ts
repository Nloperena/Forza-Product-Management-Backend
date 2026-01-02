import axios from 'axios';

const API_BASE_URL = 'https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api';

async function findProductsWithoutFullNames() {
  console.log('🔍 Finding all products without full names...\n');

  try {
    // Get all products
    const response = await axios.get(`${API_BASE_URL}/products`, {
      timeout: 30000
    });
    
    const allProducts = Array.isArray(response.data) ? response.data : [];
    console.log(`📦 Found ${allProducts.length} total products in database\n`);

    const productsWithoutFullNames: Array<{
      product_id: string;
      name: string;
      full_name: string;
    }> = [];

    for (const product of allProducts) {
      const name = product.name || '';
      const fullName = product.full_name || '';
      
      // Check if the name has a "–" separator (indicating a full descriptive name)
      const hasFullNameFormat = name.includes('–') || fullName.includes('–');
      
      // Also check if it's just a brand name or product ID without description
      const isJustBrandName = name.match(/^(ForzaBOND®|ForzaSEAL®|ForzaTAPE®)\s*[A-Z0-9-]+$/i);
      const isJustProductId = name === product.product_id || fullName === product.product_id;
      
      if (!hasFullNameFormat || isJustBrandName || isJustProductId) {
        productsWithoutFullNames.push({
          product_id: product.product_id || 'N/A',
          name: name,
          full_name: fullName
        });
      }
    }

    console.log('='.repeat(80));
    console.log('📊 RESULTS');
    console.log('='.repeat(80));
    console.log(`\n❌ Products without full names: ${productsWithoutFullNames.length}\n`);

    if (productsWithoutFullNames.length > 0) {
      console.log('📋 List of products:\n');
      productsWithoutFullNames.forEach((p, index) => {
        console.log(`${index + 1}. ${p.product_id}`);
        console.log(`   name: "${p.name}"`);
        console.log(`   full_name: "${p.full_name}"`);
        console.log('');
      });

      // Also create a simple list
      console.log('\n' + '='.repeat(80));
      console.log('📝 Simple list (product IDs only):');
      console.log('='.repeat(80));
      console.log(productsWithoutFullNames.map(p => p.product_id).join(', '));
    } else {
      console.log('✅ All products have full names!');
    }

    console.log('\n' + '='.repeat(80));
  } catch (error: any) {
    console.error('❌ Error fetching products:', error.message);
  }
}

findProductsWithoutFullNames().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

