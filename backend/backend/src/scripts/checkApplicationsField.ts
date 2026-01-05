import axios from 'axios';

const API_BASE_URL = 'https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api';

async function checkApplicationsField() {
  try {
    console.log('🔍 Checking applications/instructions field in API...\n');
    
    const response = await axios.get(`${API_BASE_URL}/products/FRP`, {
      timeout: 30000
    });
    
    const product = response.data;
    
    console.log('FRP Product fields:');
    console.log('  Has "applications":', 'applications' in product ? 'YES' : 'NO');
    console.log('  Has "instructions":', 'instructions' in product ? 'YES' : 'NO');
    
    if ('applications' in product) {
      console.log('\n  applications value:', JSON.stringify(product.applications, null, 2));
    }
    
    if ('instructions' in product) {
      console.log('\n  instructions value:', JSON.stringify(product.instructions, null, 2));
    }
    
    console.log('\n  All product keys:', Object.keys(product).join(', '));
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

checkApplicationsField().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

