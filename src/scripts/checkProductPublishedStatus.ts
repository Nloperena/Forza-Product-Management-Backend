import axios from 'axios';

const API_BASE_URL = 'https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api';

const PRODUCTS_TO_CHECK = [
  '81-0389',
  'OS61',
  'R160',
  'R190',
  'R221',
  'R519',
  'S228',
  'OS35',
  'OS37',
  'T350',
  'T715',
  'T205',
  'T215',
  'T220',
  'T464',
  'OSA',
  'M-S750',
  'C-S538',
  'R-OSA',
  'TAC-735R',
  'TAC-OS7',
  'TAC-OS74',
  'TAC-R777',
  'TAC-R750',
  'T-OS150',
  'T-R682'
];

async function checkPublishedStatus() {
  console.log('🔍 Checking published status of newly created products...\n');

  let publishedCount = 0;
  let unpublishedCount = 0;

  for (const productId of PRODUCTS_TO_CHECK) {
    try {
      const response = await axios.get(`${API_BASE_URL}/products/${productId}`, {
        timeout: 30000
      });
      
      const product = response.data;
      const status = product.published ? '✅ Published' : '❌ Unpublished';
      
      if (product.published) {
        publishedCount++;
      } else {
        unpublishedCount++;
      }
      
      console.log(`${status} - ${productId}: ${product.name || product.full_name}`);
    } catch (error: any) {
      console.log(`❌ ${productId}: Not found - ${error.message}`);
      unpublishedCount++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Published: ${publishedCount}`);
  console.log(`❌ Unpublished: ${unpublishedCount}`);
  console.log('='.repeat(80));
}

checkPublishedStatus().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

