import axios from 'axios';

const API_BASE_URL = 'https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api';

const PRODUCTS_TO_CHECK = [
  '81-0389',
  'OS61',
  'R160',
  'T350',
  'T715',
  'OS35',
  'OS37',
  'S228',
  'R221',
  'R519'
];

async function checkProductNames() {
  console.log('🔍 Checking product names for newly created products...\n');

  for (const productId of PRODUCTS_TO_CHECK) {
    try {
      const response = await axios.get(`${API_BASE_URL}/products/${productId}`, {
        timeout: 30000
      });
      
      const product = response.data;
      
      console.log(`📦 ${productId}:`);
      console.log(`   name: "${product.name}"`);
      console.log(`   full_name: "${product.full_name}"`);
      console.log('');
    } catch (error: any) {
      console.log(`❌ ${productId}: Not found - ${error.message}\n`);
    }
  }
}

checkProductNames().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

