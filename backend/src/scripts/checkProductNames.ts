import axios from 'axios';

const API_BASE_URL = 'https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api';

const PRODUCTS_TO_CHECK = [
  'FRP',
  'IC933',
  'IC934',
  'IC946',
  'MC722',
  'C130',
  'C331',
  'OA4',
  'OS24',
  'OS2'
];

async function checkProductNames() {
  console.log('🔍 Checking product names in Heroku database...\n');

  for (const productId of PRODUCTS_TO_CHECK) {
    try {
      const response = await axios.get(`${API_BASE_URL}/products/${productId}`, {
        timeout: 30000
      });
      
      const product = response.data;
      
      console.log(`📦 ${productId}:`);
      console.log(`   name: "${product.name}"`);
      console.log(`   full_name: "${product.full_name}"`);
      console.log(`   product_id: "${product.product_id}"`);
      console.log('');
    } catch (error: any) {
      console.log(`❌ ${productId}: Not found or error - ${error.message}`);
      console.log('');
    }
  }
}

checkProductNames().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

