import { ProductModel, Product } from '../models/Product';
import { databaseService } from '../services/database';
import fs from 'fs';
import path from 'path';

// Interface for the backend import JSON structure
interface BackendImportProduct {
  product_id: string;
  name: string;
  full_name: string;
  description: string;
  brand: string;
  industry: string;
  chemistry?: string;
  image?: string;
  applications: string[];
  benefits: string[];
  sizing?: string[];
  technical: any[];
  published: boolean;
  created_at: string;
  updated_at: string;
}

async function importBackendProducts(): Promise<void> {
  try {
    console.log('🌱 Starting backend products import...');
    
    // Connect to database
    await databaseService.connect();
    await databaseService.initializeDatabase();
    
    // Initialize ProductModel with database connection
    const productModel = new ProductModel(databaseService.getDatabase());
    
    // Load backend import products data
    const importDataPath = path.join(__dirname, '../../backend-import.json');
    
    if (!fs.existsSync(importDataPath)) {
      throw new Error(`Backend import data file not found at: ${importDataPath}`);
    }
    
    console.log('📄 Loading backend import products data...');
    const importProducts: BackendImportProduct[] = JSON.parse(fs.readFileSync(importDataPath, 'utf8'));
    
    console.log(`📊 Found ${importProducts.length} products to import`);
    
    // Check if products already exist and ask for confirmation
    const existingProducts = await productModel.getAllProducts();
    const existingProductIds = existingProducts.map(p => p.product_id);
    const newProducts = importProducts.filter(p => !existingProductIds.includes(p.product_id));
    const duplicateProducts = importProducts.filter(p => existingProductIds.includes(p.product_id));
    
    console.log(`\n📋 Import Summary:`);
    console.log(`- New products: ${newProducts.length}`);
    console.log(`- Duplicate products (will be skipped): ${duplicateProducts.length}`);
    
    if (duplicateProducts.length > 0) {
      console.log(`\n⚠️  Duplicate products that will be skipped:`);
      duplicateProducts.forEach(p => console.log(`  - ${p.product_id}: ${p.name}`));
    }
    
    if (newProducts.length === 0) {
      console.log('✅ All products already exist in database. No import needed.');
      return;
    }
    
    // Insert new products
    let insertedCount = 0;
    let errorCount = 0;
    
    console.log(`\n🚀 Importing ${newProducts.length} new products...`);
    
    for (const importProduct of newProducts) {
      try {
        const productData: Omit<Product, 'id' | 'created_at' | 'updated_at'> = {
          product_id: importProduct.product_id,
          name: importProduct.name,
          full_name: importProduct.full_name,
          description: importProduct.description,
          brand: importProduct.brand,
          industry: importProduct.industry,
          chemistry: importProduct.chemistry || undefined,
          url: undefined, // Not provided in import data
          image: importProduct.image || undefined,
          benefits: importProduct.benefits,
          applications: importProduct.applications,
          technical: importProduct.technical || [],
          sizing: importProduct.sizing || [],
          published: importProduct.published,
          benefits_count: importProduct.benefits.length,
          last_edited: new Date().toISOString()
        };
        
        await productModel.createProduct(productData);
        insertedCount++;
        
        console.log(`✅ Imported: ${importProduct.product_id} - ${importProduct.name}`);
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error importing product ${importProduct.product_id}:`, error);
      }
    }
    
    console.log(`\n🎉 Import completed!`);
    console.log(`- Successfully imported: ${insertedCount} products`);
    console.log(`- Errors: ${errorCount} products`);
    
    // Verify the data
    const stats = await productModel.getStatistics();
    const brandIndustryCounts = await productModel.getBrandIndustryCounts();
    
    console.log('\n📈 Updated Database Statistics:');
    console.log(`- Total Products: ${stats.total_products}`);
    console.log(`- Total Benefits: ${stats.total_benefits}`);
    console.log(`- Brands: ${Object.keys(brandIndustryCounts).length}`);
    
    Object.entries(brandIndustryCounts).forEach(([brand, industries]) => {
      const totalProducts = Object.values(industries).reduce((sum, count) => sum + count, 0);
      console.log(`  - ${brand}: ${totalProducts} products across ${Object.keys(industries).length} industries`);
    });
    
  } catch (error) {
    console.error('❌ Error importing backend products:', error);
    process.exit(1);
  } finally {
    await databaseService.disconnect();
    process.exit(0);
  }
}

// Run the import script
if (require.main === module) {
  importBackendProducts();
}

export { importBackendProducts };
