import express from 'express';
import { ProductController } from '../controllers/productController';
import { seedDatabase } from '../scripts/seedDatabase';

const router = express.Router();

// Lazy initialization of controller to avoid database connection issues
let productController: ProductController | null = null;

function getProductController(): ProductController {
  if (!productController) {
    productController = new ProductController();
  }
  return productController;
}

// GET /api/products - Get all products
router.get('/', (req, res) => getProductController().getAllProducts(req, res));

// GET /api/products/test - Simple test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Test endpoint working!',
    timestamp: new Date().toISOString()
  });
});

// GET /api/products/statistics - Get product statistics
router.get('/statistics', (req, res) => getProductController().getStatistics(req, res));

// POST /api/products/seed - Seed the database with Forza products
router.post('/seed', async (req, res) => {
  try {
    console.log('🌱 Starting database seeding via API...');
    
    // Use the existing database service
    const { databaseService } = require('../services/database');
    
    if (databaseService.isPostgres()) {
      const client = await databaseService.getClient();
      try {
        // Create table first
        await client.query(`
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

        // Clear existing data
        await client.query('DELETE FROM products');

        // Insert sample products
        await client.query(`
          INSERT INTO products (product_id, name, full_name, description, brand, industry, chemistry, url, image, benefits, applications, technical, sizing, published, benefits_count) VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15),
          ($16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30)
        `, [
          'SAMPLE001', 'Sample Product 1', 'Sample Product 1 - Test Product', 'This is a sample product for testing', 'forza_bond', 'industrial_industry', 'Sample Chemistry', 'https://example.com', 'sample1.jpg', JSON.stringify(['Benefit 1', 'Benefit 2']), JSON.stringify(['Application 1', 'Application 2']), JSON.stringify([{property: 'Property 1', value: 'Value 1'}]), JSON.stringify(['Size 1', 'Size 2']), true, 2,
          'SAMPLE002', 'Sample Product 2', 'Sample Product 2 - Another Test Product', 'This is another sample product for testing', 'forza_seal', 'automotive_industry', 'Sample Chemistry 2', 'https://example2.com', 'sample2.jpg', JSON.stringify(['Benefit A', 'Benefit B']), JSON.stringify(['Application A', 'Application B']), JSON.stringify([{property: 'Property A', value: 'Value A'}]), JSON.stringify(['Size A', 'Size B']), true, 2
        ]);
      } finally {
        client.release();
      }
    } else {
      // For SQLite (local development)
      throw new Error('Seeding endpoint only works with PostgreSQL');
    }

    res.json({ 
      success: true, 
      message: 'Database seeded successfully with sample products!' 
    });
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to seed database',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/products - Create new product
router.post('/', (req, res) => getProductController().createProduct(req, res));

// GET /api/products/:id - Get product by ID
router.get('/:id', (req, res) => getProductController().getProductById(req, res));

// PUT /api/products/:id - Update product
router.put('/:id', (req, res) => getProductController().updateProduct(req, res));

// DELETE /api/products/:id - Delete product
router.delete('/:id', (req, res) => getProductController().deleteProduct(req, res));

export default router;