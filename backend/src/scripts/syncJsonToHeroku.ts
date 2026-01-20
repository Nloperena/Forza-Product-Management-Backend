import fs from 'fs';
import path from 'path';
import { ProductModel } from '../models/Product';
import { databaseService } from '../services/database';

interface JsonProduct {
  product_id: string;
  name: string;
  full_name?: string;
  description: string;
  brand: string;
  industry: string;
  chemistry: string;
  url: string;
  image: string;
  benefits: string[];
  applications: string[];
  technical: Array<{ property: string; value: string }>;
  sizing: string[];
  color: string;
  cleanup: string;
  recommended_equipment: string;
  published: boolean;
  last_edited?: string;
  benefits_count?: number;
}

interface SyncResult {
  productId: string;
  status: 'updated' | 'not_found' | 'error' | 'skipped';
  message?: string;
}

class JsonToHerokuSync {
  private productModel!: ProductModel;
  private dryRun: boolean;
  private results: SyncResult[] = [];
  private jsonProducts: JsonProduct[] = [];

  constructor(dryRun: boolean = true) {
    this.dryRun = dryRun;
  }

  private loadJsonProducts(): void {
    const jsonPath = path.join(__dirname, '../../data/forza_products_organized.json');
    console.log(`📂 Loading JSON from: ${jsonPath}`);
    
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(jsonContent);
    
    // Navigate the nested structure: forza_products_organized -> brand -> products -> industry -> products
    const organizedData = data.forza_products_organized || data;
    
    for (const key of Object.keys(organizedData)) {
      if (key === 'metadata') continue;
      
      const brandData = organizedData[key];
      if (!brandData || !brandData.products) continue;
      
      for (const industryKey of Object.keys(brandData.products)) {
        const industryData = brandData.products[industryKey];
        if (!industryData || !industryData.products) continue;
        
        if (Array.isArray(industryData.products)) {
          this.jsonProducts.push(...industryData.products);
        }
      }
    }
    
    console.log(`📦 Loaded ${this.jsonProducts.length} products from JSON\n`);
  }

  private async initializeProductModel(): Promise<void> {
    if (databaseService.isPostgres()) {
      this.productModel = new ProductModel();
    } else {
      const db = databaseService.getDatabase();
      if (!db) {
        throw new Error('Database not initialized');
      }
      this.productModel = new ProductModel(db);
    }
  }

  async execute(): Promise<void> {
    const isPostgres = databaseService.isPostgres();
    const dbType = isPostgres ? 'PostgreSQL (Heroku)' : 'SQLite (Local)';
    
    console.log('🔄 Syncing JSON data to Heroku database...');
    console.log(`Database: ${dbType}`);
    console.log(`Mode: ${this.dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be saved)'}\n`);

    if (!isPostgres) {
      console.warn('⚠️  WARNING: This script is designed for Heroku/PostgreSQL.');
      console.warn('⚠️  DATABASE_URL environment variable is not set.');
      console.warn('⚠️  Set DATABASE_URL to your Heroku database URL.\n');
    }

    // Load JSON data
    this.loadJsonProducts();

    // Connect to database
    await databaseService.connect();
    await databaseService.initializeDatabase();
    await this.initializeProductModel();

    // Get all products from database
    const dbProducts = await this.productModel.getAllProducts();
    console.log(`📊 Found ${dbProducts.length} products in database\n`);

    // Create a map for quick lookup
    const dbProductMap = new Map(
      dbProducts.map(p => [p.product_id?.toUpperCase(), p])
    );

    let updateCount = 0;
    
    for (const jsonProduct of this.jsonProducts) {
      const productId = jsonProduct.product_id;
      const dbProduct = dbProductMap.get(productId?.toUpperCase());

      if (!dbProduct) {
        this.results.push({
          productId,
          status: 'not_found',
          message: 'Product not found in database'
        });
        continue;
      }

      // Compare and check if update is needed
      const needsUpdate = this.needsUpdate(dbProduct, jsonProduct);
      
      if (!needsUpdate) {
        this.results.push({
          productId,
          status: 'skipped',
          message: 'No changes needed'
        });
        continue;
      }

      console.log(`\n📦 Updating: ${productId}`);
      console.log(`   Applications: ${JSON.stringify(jsonProduct.applications).substring(0, 100)}...`);
      
      if (!this.dryRun) {
        try {
          await this.productModel.updateProduct(dbProduct.id, {
            name: jsonProduct.name,
            full_name: jsonProduct.full_name || jsonProduct.name,
            description: jsonProduct.description,
            chemistry: jsonProduct.chemistry,
            applications: jsonProduct.applications,
            benefits: jsonProduct.benefits,
            sizing: jsonProduct.sizing,
            color: jsonProduct.color || undefined,
            cleanup: jsonProduct.cleanup || undefined,
            recommended_equipment: jsonProduct.recommended_equipment || undefined,
          });
          console.log(`   ✅ Updated successfully`);
          updateCount++;
          this.results.push({
            productId,
            status: 'updated',
            message: 'Updated successfully'
          });
        } catch (error: any) {
          console.error(`   ❌ Error: ${error.message}`);
          this.results.push({
            productId,
            status: 'error',
            message: error.message
          });
        }
      } else {
        console.log(`   ⏭️  Skipped (dry run)`);
        updateCount++;
        this.results.push({
          productId,
          status: 'updated',
          message: 'Would be updated'
        });
      }
    }

    this.printSummary(updateCount);
  }

  private needsUpdate(dbProduct: any, jsonProduct: JsonProduct): boolean {
    // Check if applications, benefits, or sizing differ
    const dbApps = JSON.stringify(dbProduct.applications || []);
    const jsonApps = JSON.stringify(jsonProduct.applications || []);
    
    const dbBenefits = JSON.stringify(dbProduct.benefits || []);
    const jsonBenefits = JSON.stringify(jsonProduct.benefits || []);
    
    const dbSizing = JSON.stringify(dbProduct.sizing || []);
    const jsonSizing = JSON.stringify(jsonProduct.sizing || []);
    
    return dbApps !== jsonApps || dbBenefits !== jsonBenefits || dbSizing !== jsonSizing;
  }

  private printSummary(updateCount: number): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 SYNC SUMMARY');
    console.log('='.repeat(80));

    const updated = this.results.filter(r => r.status === 'updated');
    const notFound = this.results.filter(r => r.status === 'not_found');
    const errors = this.results.filter(r => r.status === 'error');
    const skipped = this.results.filter(r => r.status === 'skipped');

    console.log(`\n✅ ${this.dryRun ? 'Would update' : 'Updated'}: ${updated.length}`);
    console.log(`⏭️  Skipped (no changes): ${skipped.length}`);
    console.log(`❌ Not found: ${notFound.length}`);
    console.log(`⚠️  Errors: ${errors.length}`);

    if (notFound.length > 0 && notFound.length <= 10) {
      console.log('\n📋 Products not found:');
      notFound.forEach(r => {
        console.log(`   - ${r.productId}`);
      });
    }

    if (errors.length > 0) {
      console.log('\n⚠️  Errors:');
      errors.forEach(r => {
        console.log(`   - ${r.productId}: ${r.message}`);
      });
    }

    console.log('\n' + '='.repeat(80));
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--live');

  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    console.error('❌ ERROR: DATABASE_URL environment variable is not set.');
    console.error('   Please set it to your Heroku database URL.');
    console.error('   Example: $env:DATABASE_URL="postgres://..." npx ts-node src/scripts/syncJsonToHeroku.ts --live');
    process.exit(1);
  }

  const syncer = new JsonToHerokuSync(dryRun);
  await syncer.execute();

  await databaseService.disconnect();
  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

