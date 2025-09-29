import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

interface ForzaProduct {
  name: string;
  url: string;
  image: string;
  benefits: string[];
  benefits_count: number;
  chemistry: string;
  brand: string;
  industry: string;
  applications: string[];
  technical: Array<{
    property: string;
    value: string;
    unit?: string;
  }>;
  sizing?: string[];
}

interface ForzaProductsData {
  forza_products_organized: {
    metadata: {
      total_products: number;
      total_benefits: number;
      organized_date: string;
      hierarchy: string;
      notes: string;
    };
    [brand: string]: {
      description: string;
      products: {
        [industry: string]: {
          description: string;
          products: ForzaProduct[];
        };
      };
    } | {
      total_products: number;
      total_benefits: number;
      organized_date: string;
      hierarchy: string;
      notes: string;
    };
  };
}

class RealDataMigrator {
  private pool: Pool;
  private productsData: ForzaProductsData;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    // Load the real product data
    const dataPath = path.join(__dirname, '../../data/forza_products_organized.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    this.productsData = JSON.parse(rawData);
  }

  async migrate(): Promise<void> {
    try {
      console.log('🚀 Starting real data migration to Heroku...');
      
      // Clear existing data
      await this.clearExistingData();
      
      // Process and insert all products
      const allProducts = this.extractAllProducts();
      console.log(`📦 Found ${allProducts.length} products to migrate`);
      
      let successCount = 0;
      let errorCount = 0;

      for (const product of allProducts) {
        try {
          await this.insertProduct(product);
          successCount++;
          if (successCount % 20 === 0) {
            console.log(`✅ Migrated ${successCount}/${allProducts.length} products...`);
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Error migrating product ${product.name}:`, error);
        }
      }

      console.log(`🎉 Migration completed!`);
      console.log(`✅ Successfully migrated: ${successCount} products`);
      console.log(`❌ Errors: ${errorCount} products`);
      
      // Verify migration
      await this.verifyMigration();
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  private async clearExistingData(): Promise<void> {
    console.log('🧹 Clearing existing data...');
    await this.pool.query('DELETE FROM products');
    console.log('✅ Existing data cleared');
  }

  private extractAllProducts(): ForzaProduct[] {
    const allProducts: ForzaProduct[] = [];
    const organizedData = this.productsData.forza_products_organized;

    // Iterate through all brands
    for (const [brandKey, brandData] of Object.entries(organizedData)) {
      if (brandKey === 'metadata') continue;

      // Check if this is a brand data object (has products property)
      if ('products' in brandData) {
        // Iterate through all industries for this brand
        for (const [industryKey, industryData] of Object.entries(brandData.products)) {
          // Add all products from this industry
          for (const product of industryData.products) {
            allProducts.push({
              ...product,
              brand: brandKey,
              industry: industryKey
            });
          }
        }
      }
    }

    return allProducts;
  }

  private async insertProduct(product: ForzaProduct): Promise<void> {
    // Generate a unique product_id from the name
    const product_id = this.generateProductId(product.name);
    
    // Generate full_name (same as name for now)
    const full_name = product.name;
    
    // Generate description from first few benefits
    const description = product.benefits.slice(0, 3).join('. ') + '.';
    
    // Handle image path for frontend assets
    // Use simple filename that frontend can serve from /public/product-images/
    const imageFileName = path.basename(product.image);
    const image = imageFileName; // Just the filename, no path
    
    const sql = `
      INSERT INTO products (
        product_id, name, full_name, description, brand, industry,
        chemistry, url, image, benefits, applications, technical, sizing,
        published, benefits_count, last_edited
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `;

    const params = [
      product_id,
      product.name,
      full_name,
      description,
      product.brand,
      product.industry,
      product.chemistry || '',
      product.url || '',
      image,
      JSON.stringify(product.benefits),
      JSON.stringify(product.applications),
      JSON.stringify(product.technical),
      JSON.stringify(product.sizing || []),
      true, // published
      product.benefits_count || product.benefits.length,
      new Date().toISOString()
    ];

    await this.pool.query(sql, params);
  }

  private generateProductId(name: string): string {
    // Extract product code from name (e.g., "ForzaBOND® 81-0389" -> "81-0389")
    const match = name.match(/([A-Z0-9-]+)(?:\s|$)/);
    if (match) {
      return match[1];
    }
    
    // Fallback: create ID from name
    return name
      .replace(/[^a-zA-Z0-9]/g, '-')
      .toLowerCase()
      .substring(0, 20);
  }

  private async verifyMigration(): Promise<void> {
    console.log('🔍 Verifying migration...');
    
    const result = await this.pool.query('SELECT COUNT(*) as count FROM products');
    const count = parseInt(result.rows[0].count);
    
    console.log(`📊 Total products in database: ${count}`);
    
    // Get some sample products
    const sampleResult = await this.pool.query(`
      SELECT product_id, name, brand, industry, benefits_count 
      FROM products 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('📋 Sample products:');
    sampleResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.name} (${row.brand}/${row.industry}) - ${row.benefits_count} benefits`);
    });
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  const migrator = new RealDataMigrator();
  migrator.migrate()
    .then(() => {
      console.log('✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { RealDataMigrator };
