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

class RemigratorWithCorrectImages {
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

  async remigrate(): Promise<void> {
    try {
      console.log('🚀 Starting complete re-migration with correct image paths...');
      
      // Clear existing data
      await this.clearExistingData();
      
      // Process and insert all products with correct image paths
      const allProducts = this.extractAllProducts();
      console.log(`📦 Found ${allProducts.length} products to migrate`);
      
      let successCount = 0;
      let errorCount = 0;
      let imageIssues = 0;

      for (const product of allProducts) {
        try {
          // Fix image path before inserting
          const fixedProduct = this.fixImagePath(product);
          if (fixedProduct.image !== product.image) {
            imageIssues++;
          }
          
          await this.insertProduct(fixedProduct);
          successCount++;
          
          if (successCount % 20 === 0) {
            console.log(`✅ Migrated ${successCount}/${allProducts.length} products...`);
          }
        } catch (error) {
          errorCount++;
          console.error(`❌ Error migrating product ${product.name}:`, error);
        }
      }

      console.log(`🎉 Re-migration completed!`);
      console.log(`✅ Successfully migrated: ${successCount} products`);
      console.log(`❌ Errors: ${errorCount} products`);
      console.log(`🔧 Image paths fixed: ${imageIssues} products`);
      
      // Verify migration
      await this.verifyMigration();
      
    } catch (error) {
      console.error('❌ Re-migration failed:', error);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  private fixImagePath(product: ForzaProduct): ForzaProduct {
    let fixedImage = product.image;
    
    // Remove leading /product-images/ or product-images/ prefix
    if (fixedImage.startsWith('/product-images/')) {
      fixedImage = fixedImage.substring('/product-images/'.length);
    } else if (fixedImage.startsWith('product-images/')) {
      fixedImage = fixedImage.substring('product-images/'.length);
    }
    
    return {
      ...product,
      image: fixedImage
    };
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
      product.image,
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
    console.log('🔍 Verifying re-migration...');
    
    const result = await this.pool.query('SELECT COUNT(*) as count FROM products');
    const count = parseInt(result.rows[0].count);
    
    console.log(`📊 Total products in database: ${count}`);
    
    // Check for any remaining incorrect image paths
    const incorrectPathsResult = await this.pool.query(`
      SELECT COUNT(*) as count 
      FROM products 
      WHERE image LIKE '/product-images/%' OR image LIKE 'product-images/%'
    `);
    const incorrectCount = parseInt(incorrectPathsResult.rows[0].count);
    
    if (incorrectCount === 0) {
      console.log('✅ All image paths are correct!');
    } else {
      console.log(`⚠️  ${incorrectCount} products still have incorrect image paths`);
    }
    
    // Get some sample products
    const sampleResult = await this.pool.query(`
      SELECT product_id, name, brand, industry, image, benefits_count 
      FROM products 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('📋 Sample products with image paths:');
    sampleResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.name} (${row.brand}/${row.industry}) - Image: ${row.image} - ${row.benefits_count} benefits`);
    });
  }
}

// Run re-migration if this script is executed directly
if (require.main === module) {
  const remigrator = new RemigratorWithCorrectImages();
  remigrator.remigrate()
    .then(() => {
      console.log('✅ Re-migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Re-migration script failed:', error);
      process.exit(1);
    });
}

export { RemigratorWithCorrectImages };
