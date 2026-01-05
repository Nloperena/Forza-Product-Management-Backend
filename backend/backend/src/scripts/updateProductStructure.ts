import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

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
  published: boolean;
  product_id: string;
  full_name: string;
  description: string;
  sizing: string[];
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

class ProductStructureUpdater {
  private pool: Pool;
  private productsData: ForzaProductsData;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Load the JSON data
    const jsonPath = path.join(__dirname, '../../data/forza_products_organized.json');
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    this.productsData = JSON.parse(jsonContent);
  }

  async updateProductStructure(): Promise<void> {
    try {
      console.log('🔄 Starting product structure update...');
      
      // Clear existing data
      await this.clearExistingData();
      
      // Extract all products from the JSON structure
      const allProducts = this.extractAllProducts();
      console.log(`📦 Found ${allProducts.length} products to migrate`);
      
      // Migrate products
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

  private extractAllProducts(): ForzaProduct[] {
    const allProducts: ForzaProduct[] = [];
    const organizedData = this.productsData.forza_products_organized;

    // Iterate through each brand
    for (const brandKey in organizedData) {
      if (brandKey === 'metadata') continue;
      
      const brand = organizedData[brandKey] as any;
      if (!brand.products) continue;

      // Iterate through each industry within the brand
      for (const industryKey in brand.products) {
        const industry = brand.products[industryKey];
        if (!industry.products) continue;

        // Add all products from this industry
        allProducts.push(...industry.products);
      }
    }

    return allProducts;
  }

  private async clearExistingData(): Promise<void> {
    console.log('🧹 Clearing existing data...');
    await this.pool.query('DELETE FROM products');
    console.log('✅ Existing data cleared');
  }

  private async insertProduct(product: ForzaProduct): Promise<void> {
    const {
      product_id,
      name,
      full_name,
      description,
      brand,
      industry,
      chemistry,
      url,
      image,
      benefits,
      applications,
      technical,
      sizing,
      published,
      benefits_count
    } = product;
    
    // Handle image path - use frontend assets for existing images
    const imageFileName = path.basename(image);
    const imagePath = imageFileName; // Just the filename for frontend assets
    
    const sql = `
      INSERT INTO products (
        product_id, name, full_name, description, brand, industry,
        chemistry, url, image, benefits, applications, technical, sizing,
        published, benefits_count, last_edited
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    `;

    const params = [
      product_id,
      name,
      full_name,
      description,
      brand,
      industry,
      chemistry || '',
      url || '',
      imagePath,
      JSON.stringify(benefits),
      JSON.stringify(applications),
      JSON.stringify(technical),
      JSON.stringify(sizing || []),
      published,
      benefits_count || benefits.length,
      new Date().toISOString()
    ];

    await this.pool.query(sql, params);
  }

  private async verifyMigration(): Promise<void> {
    console.log('🔍 Verifying migration...');
    
    const result = await this.pool.query('SELECT COUNT(*) FROM products');
    const count = parseInt(result.rows[0].count);
    
    console.log(`📊 Total products in database: ${count}`);
    
    // Check published vs unpublished
    const publishedResult = await this.pool.query('SELECT COUNT(*) FROM products WHERE published = true');
    const unpublishedResult = await this.pool.query('SELECT COUNT(*) FROM products WHERE published = false');
    
    console.log(`📊 Published products: ${publishedResult.rows[0].count}`);
    console.log(`📊 Unpublished products: ${unpublishedResult.rows[0].count}`);
    
    // Sample a few products to verify structure
    const sampleResult = await this.pool.query('SELECT product_id, name, full_name, benefits_count FROM products LIMIT 3');
    console.log('📋 Sample products:');
    sampleResult.rows.forEach(row => {
      console.log(`  - ${row.product_id}: ${row.name} (${row.benefits_count} benefits)`);
    });
  }
}

// Run if called directly
if (require.main === module) {
  const updater = new ProductStructureUpdater();
  updater.updateProductStructure()
    .then(() => {
      console.log('🎉 Product structure update completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Product structure update failed:', error);
      process.exit(1);
    });
}

export { ProductStructureUpdater };
