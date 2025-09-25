import { ProductModel, Product } from '../models/Product';
import { databaseService } from '../services/database';
import fs from 'fs';
import path from 'path';

// Interface for the Forza JSON structure
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
  sizing?: string[];
  last_edited?: string;
}

interface ForzaData {
  forza_products_organized: {
    metadata: {
      total_products: number;
      total_benefits: number;
      organized_date: string;
      hierarchy: string;
      notes: string;
    };
    [key: string]: any;
  };
}

async function seedDatabase(): Promise<void> {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to database
    await databaseService.connect();
    await databaseService.initializeDatabase();
    
    const db = databaseService.getDatabase();
    const productModel = new ProductModel(db);
    
    // Load Forza products data
    const forzaDataPath = path.join(__dirname, '../../data/forza_products_organized.json');
    
    if (!fs.existsSync(forzaDataPath)) {
      throw new Error(`Forza products data file not found at: ${forzaDataPath}`);
    }
    
    console.log('📄 Loading Forza products data...');
    const forzaData: ForzaData = JSON.parse(fs.readFileSync(forzaDataPath, 'utf8'));
    
    // Extract all products from the Forza JSON structure
    const products: ForzaProduct[] = [];
    
    Object.values(forzaData.forza_products_organized).forEach(brandCategory => {
      if (typeof brandCategory === 'object' && brandCategory !== null && 'products' in brandCategory) {
        const brandData = brandCategory as any;
        
        Object.values(brandData.products).forEach((industryCategory: any) => {
          if (typeof industryCategory === 'object' && industryCategory !== null && 'products' in industryCategory) {
            const industryData = industryCategory as any;
            
            if (Array.isArray(industryData.products)) {
              industryData.products.forEach((product: ForzaProduct) => {
                products.push(product);
              });
            }
          }
        });
      }
    });
    
    console.log(`📊 Found ${products.length} products to seed`);
    
    // Clear existing products (optional - remove this line if you want to keep existing data)
    console.log('🗑️  Clearing existing products...');
    db.run('DELETE FROM products', (err) => {
      if (err) {
        console.error('Error clearing products:', err);
      } else {
        console.log('✅ Existing products cleared');
      }
    });
    
    // Insert products in batches
    const batchSize = 50;
    let insertedCount = 0;
    
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(products.length / batchSize)}...`);
      
      for (const forzaProduct of batch) {
        try {
          const productData: Omit<Product, 'id' | 'created_at' | 'updated_at'> = {
            product_id: forzaProduct.product_id,
            name: forzaProduct.name,
            full_name: forzaProduct.full_name,
            description: forzaProduct.description,
            brand: forzaProduct.brand,
            industry: forzaProduct.industry,
            chemistry: forzaProduct.chemistry,
            url: forzaProduct.url,
            image: forzaProduct.image,
            benefits: forzaProduct.benefits,
            applications: forzaProduct.applications,
            technical: forzaProduct.technical,
            sizing: forzaProduct.sizing || [],
            published: forzaProduct.published,
            benefits_count: forzaProduct.benefits_count,
            last_edited: forzaProduct.last_edited || new Date().toISOString()
          };
          
          await productModel.createProduct(productData);
          insertedCount++;
          
          if (insertedCount % 25 === 0) {
            console.log(`✅ Inserted ${insertedCount}/${products.length} products`);
          }
        } catch (error) {
          console.error(`❌ Error inserting product ${forzaProduct.product_id}:`, error);
        }
      }
    }
    
    console.log(`🎉 Database seeding completed! Inserted ${insertedCount} products`);
    
    // Verify the data
    // const allProducts = await productModel.getAllProducts();
    const stats = await productModel.getStatistics();
    const brandIndustryCounts = await productModel.getBrandIndustryCounts();
    
    console.log('\n📈 Database Statistics:');
    console.log(`- Total Products: ${stats.total_products}`);
    console.log(`- Total Benefits: ${stats.total_benefits}`);
    console.log(`- Brands: ${Object.keys(brandIndustryCounts).length}`);
    
    Object.entries(brandIndustryCounts).forEach(([brand, industries]) => {
      const totalProducts = Object.values(industries).reduce((sum, count) => sum + count, 0);
      console.log(`  - ${brand}: ${totalProducts} products across ${Object.keys(industries).length} industries`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await databaseService.disconnect();
    process.exit(0);
  }
}

// Run the seeding script
if (require.main === module) {
  seedDatabase();
}

export { seedDatabase };
