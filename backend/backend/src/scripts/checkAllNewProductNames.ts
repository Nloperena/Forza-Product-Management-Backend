import axios from 'axios';

const API_BASE_URL = 'https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api';

// All newly created products
const NEW_PRODUCTS = [
  '81-0389', 'A450', 'A465', 'A729', 'C110', 'C805', 'C830', 'C835',
  'H103', 'H117', 'H158', 'H163', 'H164', 'H167', 'H176',
  'IC936', 'IC951', 'IC952', 'IC955NF',
  'OA28', 'OA29', 'OS61', 'OS35', 'OS37', 'OSA',
  'R160', 'R190', 'R221', 'R519', 'S228',
  'T305', 'T310', 'T449', 'T465', 'T532',
  'W700', 'CA2400', 'CA1500',
  'M-C283', 'MC736', 'MC739', 'M-R478', 'M-S750',
  'TAC-735R', 'TAC-OS7', 'TAC-OS74', 'TAC-R777', 'TAC-R750',
  'TC471', 'T-OS150', 'T-R682', 'C-S538', 'R-OSA'
];

async function checkAllNewProductNames() {
  console.log('🔍 Checking names of all newly created products...\n');

  let hasFullName = 0;
  let missingFullName = 0;
  const missingFullNameList: string[] = [];

  for (const productId of NEW_PRODUCTS) {
    try {
      const response = await axios.get(`${API_BASE_URL}/products/${productId}`, {
        timeout: 30000
      });
      
      const product = response.data;
      const name = product.name || '';
      const fullName = product.full_name || '';
      
      // Check if name contains '–' (full name format)
      const hasFullNameFormat = name.includes('–') || fullName.includes('–');
      
      if (hasFullNameFormat) {
        hasFullName++;
        console.log(`✅ ${productId}: Has full name format`);
        console.log(`   "${name}"`);
      } else {
        missingFullName++;
        missingFullNameList.push(productId);
        console.log(`❌ ${productId}: Missing full name format`);
        console.log(`   name: "${name}"`);
        console.log(`   full_name: "${fullName}"`);
      }
      console.log('');
    } catch (error: any) {
      console.log(`⚠️  ${productId}: Not found\n`);
    }
  }

  console.log('='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Products with full names: ${hasFullName}`);
  console.log(`❌ Products missing full names: ${missingFullName}`);
  
  if (missingFullNameList.length > 0) {
    console.log('\n📋 Products that need full names:');
    missingFullNameList.forEach(id => console.log(`   - ${id}`));
  }
  console.log('='.repeat(80));
}

checkAllNewProductNames().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

