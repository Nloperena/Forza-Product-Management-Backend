import axios from 'axios';

const API_BASE_URL = 'https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api';

// Products to check
const PRODUCTS_TO_CHECK = [
  'IC933', 'IC934', 'IC946', 'MC739', 'MC722', 'C130', 'C150', 'C331', 'FRP', 'I1000',
  'OA4', 'OA75', 'OA99', 'OSA', 'OS24', 'R160', 'R221', 'R519', 'R529', 'S228',
  'T220', 'T215', 'T350', 'T461', 'T464', 'T500', 'T600', 'T715', 'T900', 'T950', 'T970',
  'OS2', 'OS31', 'OS35', 'OS37', 'OS45', 'OS55', 'OS61'
];

interface ProductCheck {
  product_id: string;
  name: string;
  hasDescription: boolean;
  hasBenefits: boolean;
  hasApplications: boolean;
  hasTechnical: boolean;
  isFleshedOut: boolean;
  missingFields: string[];
}

async function checkProductsFleshedOut() {
  console.log('🔍 Checking which products are not fleshed out...\n');

  const results: ProductCheck[] = [];
  const notFleshedOut: string[] = [];
  const notFound: string[] = [];

  for (const productId of PRODUCTS_TO_CHECK) {
    try {
      const response = await axios.get(`${API_BASE_URL}/products/${productId}`, {
        timeout: 30000
      });
      
      const product = response.data;
      
      const hasDescription = !!(product.description && product.description.trim().length > 0);
      const hasBenefits = !!(product.benefits && Array.isArray(product.benefits) && product.benefits.length > 0);
      const hasApplications = !!(product.applications && Array.isArray(product.applications) && product.applications.length > 0);
      const hasTechnical = !!(product.technical && Array.isArray(product.technical) && product.technical.length > 0);
      
      const missingFields: string[] = [];
      if (!hasDescription) missingFields.push('description');
      if (!hasBenefits) missingFields.push('benefits');
      if (!hasApplications) missingFields.push('applications');
      if (!hasTechnical) missingFields.push('technical');
      
      const isFleshedOut = hasDescription && hasBenefits && hasApplications && hasTechnical;
      
      const check: ProductCheck = {
        product_id: product.product_id || productId,
        name: product.name || product.full_name || productId,
        hasDescription,
        hasBenefits,
        hasApplications,
        hasTechnical,
        isFleshedOut,
        missingFields
      };
      
      results.push(check);
      
      if (!isFleshedOut) {
        notFleshedOut.push(productId);
      }
    } catch (error: any) {
      console.log(`⚠️  ${productId}: Not found in database`);
      notFound.push(productId);
    }
  }

  console.log('='.repeat(80));
  console.log('📊 RESULTS');
  console.log('='.repeat(80));
  
  const fleshedOut = results.filter(r => r.isFleshedOut);
  const notFleshed = results.filter(r => !r.isFleshedOut);
  
  console.log(`\n✅ Fully fleshed out: ${fleshedOut.length}`);
  console.log(`❌ Not fully fleshed out: ${notFleshed.length}`);
  console.log(`⚠️  Not found: ${notFound.length}`);

  if (notFleshed.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('❌ PRODUCTS NOT FULLY FLESHED OUT:');
    console.log('='.repeat(80));
    
    notFleshed.forEach((check, index) => {
      console.log(`\n${index + 1}. ${check.product_id}: ${check.name}`);
      console.log(`   Missing: ${check.missingFields.join(', ') || 'none (but incomplete)'}`);
      console.log(`   Description: ${check.hasDescription ? '✅' : '❌'}`);
      console.log(`   Benefits: ${check.hasBenefits ? '✅' : '❌'}`);
      console.log(`   Applications: ${check.hasApplications ? '✅' : '❌'}`);
      console.log(`   Technical: ${check.hasTechnical ? '✅' : '❌'}`);
    });
  }

  if (notFound.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('⚠️  PRODUCTS NOT FOUND IN DATABASE:');
    console.log('='.repeat(80));
    console.log(notFound.join(', '));
  }

  // Simple list
  console.log('\n' + '='.repeat(80));
  console.log('📝 SIMPLE LIST - Products not fully fleshed out:');
  console.log('='.repeat(80));
  console.log(notFleshedOut.join(', '));

  // Save to file
  const fs = require('fs');
  fs.writeFileSync(
    'products_not_fleshed_out.txt',
    notFleshedOut.join(', ')
  );

  console.log('\n' + '='.repeat(80));
  console.log('✅ List saved to: products_not_fleshed_out.txt');
  console.log('='.repeat(80));
}

checkProductsFleshedOut().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

