const { Pool } = require('pg');

// Simple script to seed Heroku Postgres database
async function seedHerokuDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🌱 Connecting to Heroku Postgres...');
    
    // Create table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        product_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        description TEXT,
        brand VARCHAR(100),
        industry VARCHAR(100),
        chemistry TEXT,
        url TEXT,
        image TEXT,
        benefits JSONB DEFAULT '[]',
        applications JSONB DEFAULT '[]',
        technical JSONB DEFAULT '[]',
        sizing JSONB DEFAULT '[]',
        published BOOLEAN DEFAULT false,
        benefits_count INTEGER DEFAULT 0,
        last_edited TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Table created/verified');

    // Clear existing data
    await pool.query('DELETE FROM products');
    console.log('✅ Existing data cleared');

    // Insert sample products
    const sampleProducts = [
      {
        product_id: 'SAMPLE001',
        name: 'Sample Product 1',
        full_name: 'Sample Product 1 - Test Product',
        description: 'This is a sample product for testing',
        brand: 'forza_bond',
        industry: 'industrial_industry',
        chemistry: 'Sample Chemistry',
        url: 'https://example.com',
        image: 'sample1.jpg',
        benefits: ['Benefit 1', 'Benefit 2'],
        applications: ['Application 1', 'Application 2'],
        technical: [{ property: 'Property 1', value: 'Value 1' }],
        sizing: ['Size 1', 'Size 2'],
        published: true,
        benefits_count: 2
      },
      {
        product_id: 'SAMPLE002',
        name: 'Sample Product 2',
        full_name: 'Sample Product 2 - Another Test Product',
        description: 'This is another sample product for testing',
        brand: 'forza_seal',
        industry: 'automotive_industry',
        chemistry: 'Sample Chemistry 2',
        url: 'https://example2.com',
        image: 'sample2.jpg',
        benefits: ['Benefit A', 'Benefit B'],
        applications: ['Application A', 'Application B'],
        technical: [{ property: 'Property A', value: 'Value A' }],
        sizing: ['Size A', 'Size B'],
        published: true,
        benefits_count: 2
      }
    ];

    for (const product of sampleProducts) {
      await pool.query(`
        INSERT INTO products (
          product_id, name, full_name, description, brand, industry,
          chemistry, url, image, benefits, applications, technical, sizing,
          published, benefits_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        product.product_id, product.name, product.full_name, product.description,
        product.brand, product.industry, product.chemistry, product.url, product.image,
        JSON.stringify(product.benefits), JSON.stringify(product.applications),
        JSON.stringify(product.technical), JSON.stringify(product.sizing),
        product.published, product.benefits_count
      ]);
    }

    console.log('✅ Sample products inserted');

    // Verify data
    const result = await pool.query('SELECT COUNT(*) as count FROM products');
    console.log(`📊 Total products in database: ${result.rows[0].count}`);

    console.log('🎉 Heroku database seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await pool.end();
  }
}

// Run the seeding
seedHerokuDatabase();












