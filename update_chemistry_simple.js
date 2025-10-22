// Simple script to update chemistry values using existing database service
const { databaseService } = require('./dist/services/database');

async function updateChemistry() {
  try {
    console.log('🔗 Connecting to database...');
    
    if (databaseService.isPostgres()) {
      const client = await databaseService.getClient();
      try {
        console.log('🔧 Updating chemistry values...');

        // Update acrylic products (including PSA)
        const acrylicResult = await client.query(`
          UPDATE products 
          SET chemistry = 'acrylic_incl_psa'
          WHERE chemistry = 'acrylic' 
          OR chemistry = 'pressure_sensitive_adhesive'
          OR chemistry = 'methacrylate'
          OR chemistry = 'methacrylate_adhesive'
          OR name LIKE '%Acrylic%'
          OR name LIKE '%PSA%'
          OR name LIKE '%Pressure Sensitive%'
        `);

        console.log(`✅ Updated ${acrylicResult.rowCount} products to 'acrylic_incl_psa'`);

        // Update rubber based products
        const rubberResult = await client.query(`
          UPDATE products 
          SET chemistry = 'rubber_based'
          WHERE chemistry = 'rubber'
          OR chemistry = 'neoprene_contact_adhesive'
          OR chemistry = 'neoprene'
          OR name LIKE '%Rubber%'
          OR name LIKE '%Neoprene%'
        `);

        console.log(`✅ Updated ${rubberResult.rowCount} products to 'rubber_based'`);

        // Get count of products by chemistry
        const chemistryStats = await client.query(`
          SELECT chemistry, COUNT(*) as count 
          FROM products 
          WHERE chemistry IN ('acrylic_incl_psa', 'rubber_based')
          GROUP BY chemistry
          ORDER BY chemistry
        `);

        console.log('\n📊 Chemistry Statistics:');
        chemistryStats.rows.forEach(row => {
          console.log(`  ${row.chemistry}: ${row.count} products`);
        });

        console.log('\n🎉 Chemistry update completed successfully!');

      } finally {
        client.release();
      }
    } else {
      console.log('❌ This script only works with PostgreSQL database');
    }
  } catch (error) {
    console.error('❌ Error updating chemistry:', error);
  }
}

updateChemistry();
