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

// GET /api/products/debug - Debug endpoint to check raw data
router.get('/debug', async (req, res) => {
  try {
    const { databaseService } = require('../services/database');
    
    if (databaseService.isPostgres()) {
      const client = await databaseService.getClient();
      try {
        const result = await client.query('SELECT product_id, name, benefits, applications, technical, published FROM products ORDER BY created_at DESC');
        res.json({
          success: true,
          raw_data: result.rows,
          message: 'Raw database data retrieved'
        });
      } finally {
        client.release();
      }
    } else {
      res.json({
        success: false,
        message: 'Debug endpoint only works with PostgreSQL'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error in debug endpoint',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/products/statistics - Get product statistics
router.get('/statistics', (req, res) => getProductController().getStatistics(req, res));

// POST /api/products/migrate-real-data - Migrate real Forza product data
router.post('/migrate-real-data', async (req, res) => {
  try {
    console.log('🌱 Starting real data migration via API...');
    
    const { RealDataMigrator } = require('../scripts/migrateRealData');
    const migrator = new RealDataMigrator();
    
    // Run migration in background
    migrator.migrate()
      .then(() => {
        console.log('✅ Real data migration completed successfully');
      })
      .catch((error: any) => {
        console.error('❌ Real data migration failed:', error);
      });

    res.json({ 
      success: true, 
      message: 'Real data migration started! This may take a few minutes. Check logs for progress.' 
    });
  } catch (error) {
    console.error('❌ Error starting migration:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to start migration',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

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
          await client.query(`
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

// POST /api/products/update-published-status - Update published status for testing
router.post('/update-published-status', async (req, res) => {
  try {
    console.log('🔄 Starting published status update via API...');

    const { PublishedStatusUpdater } = require('../scripts/updatePublishedStatus');
    const updater = new PublishedStatusUpdater();

    updater.updatePublishedStatus()
      .then(() => {
        console.log('✅ Published status update completed successfully');
      })
      .catch((error: any) => {
        console.error('❌ Published status update failed:', error);
      });

    res.json({
      success: true,
      message: 'Published status update started! Check logs for progress.'
    });
  } catch (error) {
    console.error('❌ Error starting published status update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start published status update',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/products/update-structure - Update product structure to match JSON exactly
router.post('/update-structure', async (req, res) => {
  try {
    console.log('🔄 Starting product structure update via API...');

    const { ProductStructureUpdater } = require('../scripts/updateProductStructure');
    const updater = new ProductStructureUpdater();

    updater.updateProductStructure()
      .then(() => {
        console.log('✅ Product structure update completed successfully');
      })
      .catch((error: any) => {
        console.error('❌ Product structure update failed:', error);
      });

    res.json({
      success: true,
      message: 'Product structure update started! This will update all products to match the JSON structure exactly. Check logs for progress.'
    });
  } catch (error) {
    console.error('❌ Error starting product structure update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start product structure update',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/products/fix-image-paths - Fix image paths to work with current server setup
router.post('/fix-image-paths', async (req, res) => {
  try {
    console.log('🔧 Starting image path fix via API...');

    // Check if using PostgreSQL or SQLite
    const { databaseService } = require('../services/database');
    
    if (databaseService.isPostgres()) {
      const { ImagePathFixer } = require('../scripts/fixImagePaths');
      const fixer = new ImagePathFixer();
      
      fixer.fixImagePaths()
        .then(() => {
          console.log('✅ Image path fix completed successfully');
        })
        .catch((error: any) => {
          console.error('❌ Image path fix failed:', error);
        });
    } else {
      const { ImagePathFixerSQLite } = require('../scripts/fixImagePathsSQLite');
      const fixer = new ImagePathFixerSQLite();
      
      fixer.fixImagePaths()
        .then(() => {
          console.log('✅ Image path fix completed successfully');
        })
        .catch((error: any) => {
          console.error('❌ Image path fix failed:', error);
        });
    }

    res.json({
      success: true,
      message: 'Image path fix started! This will fix all product image paths to work with the current server setup. Check logs for progress.'
    });
  } catch (error) {
    console.error('❌ Error starting image path fix:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start image path fix',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/products/remigrate-correct-images - Complete re-migration with correct image paths
router.post('/remigrate-correct-images', async (req, res) => {
  try {
    console.log('🚀 Starting complete re-migration with correct image paths via API...');

    const { RemigratorWithCorrectImages } = require('../scripts/remigrateWithCorrectImages');
    const remigrator = new RemigratorWithCorrectImages();

    remigrator.remigrate()
      .then(() => {
        console.log('✅ Complete re-migration with correct images completed successfully');
      })
      .catch((error: any) => {
        console.error('❌ Complete re-migration with correct images failed:', error);
      });

    res.json({
      success: true,
      message: 'Complete re-migration with correct image paths started! This will clear all data and re-import everything with correct image paths. Check logs for progress.'
    });
  } catch (error) {
    console.error('❌ Error starting complete re-migration with correct images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start complete re-migration with correct images',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/products/upload-images-to-vercel - Upload all images to Vercel Blob storage
router.post('/upload-images-to-vercel', async (req, res) => {
  try {
    console.log('☁️ Starting image upload to Vercel Blob via API...');

    const { ImageUploaderToVercelBlob } = require('../scripts/uploadImagesToVercelBlob');
    const uploader = new ImageUploaderToVercelBlob();

    uploader.uploadAllImages()
      .then(() => {
        console.log('✅ Image upload to Vercel Blob completed successfully');
      })
      .catch((error: any) => {
        console.error('❌ Image upload to Vercel Blob failed:', error);
      });

    res.json({
      success: true,
      message: 'Image upload to Vercel Blob started! This will upload all local images to Vercel Blob storage and update the database. Check logs for progress.'
    });
  } catch (error) {
    console.error('❌ Error starting image upload to Vercel Blob:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start image upload to Vercel Blob',
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