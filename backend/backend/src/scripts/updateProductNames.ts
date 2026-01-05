import { ProductModel } from '../models/Product';
import { databaseService } from '../services/database';

// Product name mappings: product_id -> { name, full_name }
const PRODUCT_NAME_MAP: Record<string, { name: string; full_name: string }> = {
  'OS2': {
    name: 'OS2',
    full_name: 'OS2 – Non-Hazardous Moisture-Cure Adhesive / Sealant'
  },
  'OS31': {
    name: 'OS31',
    full_name: 'OS31 – Self-Leveling Crack-Filling Sealant'
  },
  'OS35': {
    name: 'OS35',
    full_name: 'OS35 – Low Modulus Sealant'
  },
  'OS37': {
    name: 'OS37',
    full_name: 'OS37 – Water-Based Duct Sealer'
  },
  'OS45': {
    name: 'OS45',
    full_name: 'OS45 – Acrylic Adhesive Caulk'
  },
  'OS55': {
    name: 'OS55',
    full_name: 'OS55 – Butyl Adhesive Caulk'
  },
  'OS61': {
    name: 'OS61',
    full_name: 'OS61 – High Performance Semi Self-Leveling Adhesive / Sealant'
  },
  'T220': {
    name: 'T220',
    full_name: 'T220 – Structural Acrylic, High Bond Adhesive Tape'
  },
  'T215': {
    name: 'T215',
    full_name: 'T215 – Structural Bonding of Rails Tape'
  },
  'T350': {
    name: 'T350',
    full_name: 'T350 – Thermal Break Tape'
  },
  'T461': {
    name: 'T461',
    full_name: 'T461 – Hot Melt Transfer Tape'
  },
  'T464': {
    name: 'T464',
    full_name: 'T464 – Transfer Tape'
  },
  'T500': {
    name: 'T500',
    full_name: 'T500 – Butyl Adhesive Tape'
  },
  'T600': {
    name: 'T600',
    full_name: 'T600 – Foam Gasketing Tape'
  },
  'T715': {
    name: 'T715',
    full_name: 'T715 – High-Pressure Double-Coated Tape'
  },
  'T900': {
    name: 'T900',
    full_name: 'T900 – Butyl Tape'
  },
  'T950': {
    name: 'T950',
    full_name: 'T950 – FSK Bonding Tape'
  },
  'T970': {
    name: 'T970',
    full_name: 'T970 – Foil Bonding Tape'
  }
};

interface UpdateResult {
  productId: string;
  oldName: string;
  oldFullName: string;
  newName: string;
  newFullName: string;
  status: 'updated' | 'not_found' | 'error';
  errorMessage?: string;
}

class ProductNameUpdater {
  private productModel!: ProductModel;
  private dryRun: boolean;
  private results: UpdateResult[] = [];

  constructor(dryRun: boolean = true) {
    this.dryRun = dryRun;
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
    console.log('🔄 Updating product names...');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be saved)'}\n`);

    await databaseService.connect();
    await databaseService.initializeDatabase();
    await this.initializeProductModel();

    const allProducts = await this.productModel.getAllProducts();
    console.log(`📦 Found ${allProducts.length} products in database\n`);

    for (const [productId, nameData] of Object.entries(PRODUCT_NAME_MAP)) {
      // Try to find product by product_id (exact match first, then case-insensitive)
      let product = allProducts.find(
        p => p.product_id === productId
      );

      // If not found, try case-insensitive match
      if (!product) {
        product = allProducts.find(
          p => p.product_id?.toUpperCase() === productId.toUpperCase()
        );
      }

      // If still not found, try normalized match (remove dashes)
      if (!product) {
        const normalizedSearchId = productId.toUpperCase().replace(/-/g, '');
        product = allProducts.find(
          p => {
            const pId = p.product_id?.toUpperCase() || '';
            const normalizedPId = pId.replace(/-/g, '');
            return normalizedPId === normalizedSearchId;
          }
        );
      }

      // If still not found, try lowercase match
      if (!product) {
        product = allProducts.find(
          p => p.product_id?.toLowerCase() === productId.toLowerCase()
        );
      }

      if (!product) {
        console.log(`❌ Product "${productId}" not found in database`);
        this.results.push({
          productId,
          oldName: 'N/A',
          oldFullName: 'N/A',
          newName: nameData.name,
          newFullName: nameData.full_name,
          status: 'not_found',
        });
        continue;
      }

      console.log(`\n📦 Found: ${product.product_id} - ${product.full_name || product.name}`);
      console.log(`   Current name: ${product.name}`);
      console.log(`   Current full_name: ${product.full_name}`);
      console.log(`   New name: ${nameData.name}`);
      console.log(`   New full_name: ${nameData.full_name}`);

      this.results.push({
        productId: product.product_id || product.id,
        oldName: product.name,
        oldFullName: product.full_name,
        newName: nameData.name,
        newFullName: nameData.full_name,
        status: 'updated',
      });

      if (!this.dryRun) {
        try {
          await this.productModel.updateProduct(product.id, {
            name: nameData.name,
            full_name: nameData.full_name
          });
          console.log(`   ✅ Updated successfully`);
        } catch (error: any) {
          console.error(`   ❌ Error updating: ${error.message}`);
          this.results[this.results.length - 1].status = 'error';
          this.results[this.results.length - 1].errorMessage = error.message;
        }
      } else {
        console.log(`   ⏭️  Skipped (dry run)`);
      }
    }

    this.printSummary();
  }

  private printSummary(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(80));

    const updated = this.results.filter(r => r.status === 'updated');
    const notFound = this.results.filter(r => r.status === 'not_found');
    const errors = this.results.filter(r => r.status === 'error');

    console.log(`\n✅ Successfully ${this.dryRun ? 'would update' : 'updated'}: ${updated.length}`);
    console.log(`❌ Not found: ${notFound.length}`);
    console.log(`⚠️  Errors: ${errors.length}`);

    if (notFound.length > 0) {
      console.log('\n📋 Products not found:');
      notFound.forEach(r => {
        console.log(`   - ${r.productId}`);
      });
    }

    if (errors.length > 0) {
      console.log('\n⚠️  Errors:');
      errors.forEach(r => {
        console.log(`   - ${r.productId}: ${r.errorMessage}`);
      });
    }

    console.log('\n' + '='.repeat(80));
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--live');

  const updater = new ProductNameUpdater(dryRun);
  await updater.execute();

  await databaseService.disconnect();
  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

