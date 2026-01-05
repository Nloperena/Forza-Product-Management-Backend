import axios from 'axios';

const API_BASE_URL = 'https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api';

const MISSING_PRODUCTS = [
  'C150', 'I1000', 'OA75', 'OA99', 'R529',
  'OS31', 'OS45', 'OS55',
  'T461', 'T500', 'T600', 'T900', 'T950', 'T970'
];

async function findMissingProducts() {
  console.log('🔍 Searching for missing products in database...\n');

  try {
    // Get all products
    const response = await axios.get(`${API_BASE_URL}/products`, {
      timeout: 30000
    });
    
    const allProducts = Array.isArray(response.data) ? response.data : [];
    console.log(`📦 Found ${allProducts.length} total products in database\n`);

    // Search for each missing product
    for (const productId of MISSING_PRODUCTS) {
      const found = allProducts.find(
        (p: any) => p.product_id?.toUpperCase() === productId.toUpperCase()
      );

      if (found) {
        console.log(`✅ Found ${productId}:`);
        console.log(`   name: "${found.name}"`);
        console.log(`   full_name: "${found.full_name}"`);
        console.log(`   product_id: "${found.product_id}"`);
      } else {
        // Try partial matches
        const partialMatches = allProducts.filter((p: any) => {
          const pid = (p.product_id || '').toUpperCase();
          const name = (p.name || '').toUpperCase();
          const fullName = (p.full_name || '').toUpperCase();
          return pid.includes(productId.toUpperCase()) || 
                 name.includes(productId.toUpperCase()) || 
                 fullName.includes(productId.toUpperCase());
        });

        if (partialMatches.length > 0) {
          console.log(`⚠️  ${productId}: Not found exactly, but found similar:`);
          partialMatches.forEach((p: any) => {
            console.log(`   - ${p.product_id}: "${p.name || p.full_name}"`);
          });
        } else {
          console.log(`❌ ${productId}: Not found in database`);
        }
      }
      console.log('');
    }
  } catch (error: any) {
    console.error('❌ Error fetching products:', error.message);
  }
}

findMissingProducts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

