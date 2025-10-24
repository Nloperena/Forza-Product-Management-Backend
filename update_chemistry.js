const { Client } = require('pg');

async function updateChemistry() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('🔗 Connected to PostgreSQL database');

    // Update products to have proper chemistry values for frontend filtering
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

  } catch (error) {
    console.error('❌ Error updating chemistry:', error);
  } finally {
    await client.end();
  }
}

updateChemistry();


