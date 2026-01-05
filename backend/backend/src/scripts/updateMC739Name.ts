import axios from 'axios';

const API_BASE_URL = 'https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api';

async function updateMC739() {
  console.log('🔄 Updating MC739 name...\n');

  try {
    // Get current product
    const getResponse = await axios.get(`${API_BASE_URL}/products/MC739`, {
      timeout: 30000
    });
    
    const product = getResponse.data;
    console.log(`Current name: "${product.name}"`);
    console.log(`Current full_name: "${product.full_name}"`);

    const newName = 'MC739 – Mist Spray Adhesive for Fiberglass Infusion Molding';
    
    // Update product
    const updateResponse = await axios.put(
      `${API_BASE_URL}/products/MC739`,
      {
        name: newName,
        full_name: newName
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    if (updateResponse.data.success) {
      console.log(`\n✅ Updated successfully to: "${newName}"`);
    } else {
      console.error('❌ Update failed:', updateResponse.data.message);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
}

updateMC739().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

