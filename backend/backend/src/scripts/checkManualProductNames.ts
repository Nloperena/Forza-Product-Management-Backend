import axios from 'axios';

const API_BASE_URL = 'https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api';

// Products to check with their expected full names
const PRODUCTS_TO_CHECK: Record<string, string> = {
  'IC933': 'IC933 – CA Compliant Multi-Purpose Contact Adhesive',
  'IC934': 'IC934 – Semi-Pressure Sensitive Web Spray',
  'IC946': 'IC946 – CA Compliant Pressure-Sensitive Contact Adhesive',
  'MC739': 'MC739 – Mist Spray Adhesive for Fiberglass Infusion Molding',
  'MC722': 'MC722 – Web Spray Adhesive for Marine Infusion Molding',
  'C130': 'C130 – High Heat Neoprene Adhesive',
  'C150': 'C150 – CA-Compliant High Solids Contact Adhesive',
  'C331': 'C331 – Non-Flammable Contact Adhesive',
  'FRP': 'FRP – Rollable Adhesive',
  'I1000': 'I1000 – Low-Medium Viscosity Laminating Adhesive',
  'OA4': 'OA4 – High-Strength Moisture Cure Eco-Friendly Adhesive / Sealant',
  'OA75': 'OA75 – Trowellable Flooring Adhesive',
  'OA99': 'OA99 – Bonding Putty',
  'OSA': 'OSA – Adhesive Primer and Promoter',
  'OS24': 'OS24 – High-Strength Moisture-Cure Single-Part Thixotropic Structural Adhesive / Sealant',
  'R160': 'R160 – Epoxy Quick-Set High Strength Tack Strength Adhesive',
  'R221': 'R221 – Two-Part 1:1 Modified Epoxy Adhesive',
  'R519': 'R519 – Fast Acting Two-Part Methacrylate Adhesive',
  'R529': 'R529 – Structural Anchoring Epoxy',
  'S228': 'S228 – Adhesive Primer and Promoter',
  'OS2': 'OS2 – Non-Hazardous Moisture-Cure Adhesive / Sealant',
  'OS31': 'OS31 – Self-Leveling Crack-Filling Sealant',
  'OS35': 'OS35 – Low Modulus Sealant',
  'OS37': 'OS37 – Water-Based Duct Sealer',
  'OS45': 'OS45 – Acrylic Adhesive Caulk',
  'OS55': 'OS55 – Butyl Adhesive Caulk',
  'OS61': 'OS61 – High Performance Semi Self-Leveling Adhesive / Sealant',
  'T220': 'T220 – Structural Acrylic, High Bond Adhesive Tape',
  'T215': 'T215 – Structural Bonding of Rails Tape',
  'T350': 'T350 – Thermal Break Tape',
  'T461': 'T461 – Hot Melt Transfer Tape',
  'T464': 'T464 – Transfer Tape',
  'T500': 'T500 – Butyl Adhesive Tape',
  'T600': 'T600 – Foam Gasketing Tape',
  'T715': 'T715 – High-Pressure Double-Coated Tape',
  'T900': 'T900 – Butyl Tape',
  'T950': 'T950 – FSK Bonding Tape',
  'T970': 'T970 – Foil Bonding Tape'
};

interface CheckResult {
  productId: string;
  expectedName: string;
  actualName: string;
  actualFullName: string;
  status: 'correct' | 'needs_update' | 'not_found';
}

async function checkProductNames() {
  console.log('🔍 Checking product names manually...\n');

  const results: CheckResult[] = [];

  for (const [productId, expectedName] of Object.entries(PRODUCTS_TO_CHECK)) {
    try {
      const response = await axios.get(`${API_BASE_URL}/products/${productId}`, {
        timeout: 30000
      });
      
      const product = response.data;
      const actualName = product.name || '';
      const actualFullName = product.full_name || '';
      
      // Check if either name or full_name matches expected
      const isCorrect = actualName === expectedName || actualFullName === expectedName;
      
      results.push({
        productId,
        expectedName,
        actualName,
        actualFullName,
        status: isCorrect ? 'correct' : 'needs_update'
      });

      if (isCorrect) {
        console.log(`✅ ${productId}: Correct`);
        console.log(`   "${actualName}"`);
      } else {
        console.log(`❌ ${productId}: Needs update`);
        console.log(`   Expected: "${expectedName}"`);
        console.log(`   Current name: "${actualName}"`);
        console.log(`   Current full_name: "${actualFullName}"`);
      }
      console.log('');
    } catch (error: any) {
      console.log(`⚠️  ${productId}: Not found in database\n`);
      results.push({
        productId,
        expectedName,
        actualName: 'N/A',
        actualFullName: 'N/A',
        status: 'not_found'
      });
    }
  }

  // Summary
  console.log('='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  
  const correct = results.filter(r => r.status === 'correct');
  const needsUpdate = results.filter(r => r.status === 'needs_update');
  const notFound = results.filter(r => r.status === 'not_found');

  console.log(`\n✅ Correct: ${correct.length}`);
  console.log(`❌ Needs update: ${needsUpdate.length}`);
  console.log(`⚠️  Not found: ${notFound.length}`);

  if (needsUpdate.length > 0) {
    console.log('\n📋 Products that need updates:');
    needsUpdate.forEach(r => {
      console.log(`   ${r.productId}: "${r.actualName}" → "${r.expectedName}"`);
    });
  }

  if (notFound.length > 0) {
    console.log('\n📋 Products not found:');
    notFound.forEach(r => {
      console.log(`   - ${r.productId}`);
    });
  }

  console.log('\n' + '='.repeat(80));
}

checkProductNames().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

