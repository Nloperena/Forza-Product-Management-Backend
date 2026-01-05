import axios from 'axios';

const API_BASE_URL = 'https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api';

// Product name mappings for newly created products
const PRODUCT_NAME_MAP: Record<string, { name: string; full_name: string }> = {
  '81-0389': {
    name: '81-0389 – High Performance Neoprene Contact Adhesive',
    full_name: '81-0389 – High Performance Neoprene Contact Adhesive'
  },
  'OS61': {
    name: 'OS61 – High Performance Semi Self-Leveling Adhesive / Sealant',
    full_name: 'OS61 – High Performance Semi Self-Leveling Adhesive / Sealant'
  },
  'R160': {
    name: 'R160 – Epoxy Quick-Set High Strength Tack Strength Adhesive',
    full_name: 'R160 – Epoxy Quick-Set High Strength Tack Strength Adhesive'
  },
  'R190': {
    name: 'R190 – Epoxy Adhesive',
    full_name: 'R190 – Epoxy Adhesive'
  },
  'R221': {
    name: 'R221 – Two-Part 1:1 Modified Epoxy Adhesive',
    full_name: 'R221 – Two-Part 1:1 Modified Epoxy Adhesive'
  },
  'R519': {
    name: 'R519 – Fast Acting Two-Part Methacrylate Adhesive',
    full_name: 'R519 – Fast Acting Two-Part Methacrylate Adhesive'
  },
  'S228': {
    name: 'S228 – Adhesive Primer and Promoter',
    full_name: 'S228 – Adhesive Primer and Promoter'
  },
  'OS35': {
    name: 'OS35 – Low Modulus Sealant',
    full_name: 'OS35 – Low Modulus Sealant'
  },
  'OS37': {
    name: 'OS37 – Water-Based Duct Sealer',
    full_name: 'OS37 – Water-Based Duct Sealer'
  },
  'T350': {
    name: 'T350 – Thermal Break Tape',
    full_name: 'T350 – Thermal Break Tape'
  },
  'T715': {
    name: 'T715 – High-Pressure Double-Coated Tape',
    full_name: 'T715 – High-Pressure Double-Coated Tape'
  },
  'T205': {
    name: 'T205 – Acrylic Foam Tape',
    full_name: 'T205 – Acrylic Foam Tape'
  },
  'T215': {
    name: 'T215 – Structural Bonding of Rails Tape',
    full_name: 'T215 – Structural Bonding of Rails Tape'
  },
  'T220': {
    name: 'T220 – Structural Acrylic, High Bond Adhesive Tape',
    full_name: 'T220 – Structural Acrylic, High Bond Adhesive Tape'
  },
  'T464': {
    name: 'T464 – Transfer Tape',
    full_name: 'T464 – Transfer Tape'
  },
  'OSA': {
    name: 'OSA – Adhesive Primer and Promoter',
    full_name: 'OSA – Adhesive Primer and Promoter'
  },
  'M-S750': {
    name: 'M-S750 – Tape Primer and Adhesion Promoter',
    full_name: 'M-S750 – Tape Primer and Adhesion Promoter'
  },
  'C-S538': {
    name: 'C-S538 – Tape Primer and Adhesion Promoter',
    full_name: 'C-S538 – Tape Primer and Adhesion Promoter'
  },
  'R-OSA': {
    name: 'R-OSA – Isopropyl Alcohol Based Cleaner/Adhesion Promoter',
    full_name: 'R-OSA – Isopropyl Alcohol Based Cleaner/Adhesion Promoter'
  },
  'TAC-735R': {
    name: 'TAC-735R – Mist Spray No HAPS Infusion Molding Adhesive',
    full_name: 'TAC-735R – Mist Spray No HAPS Infusion Molding Adhesive'
  },
  'TAC-OS7': {
    name: 'TAC-OS7 – Ultra High-Strength Hybrid Polymer Structural Adhesive',
    full_name: 'TAC-OS7 – Ultra High-Strength Hybrid Polymer Structural Adhesive'
  },
  'TAC-OS74': {
    name: 'TAC-OS74 – Ultra High-Strength Hybrid Polymer Structural Adhesive',
    full_name: 'TAC-OS74 – Ultra High-Strength Hybrid Polymer Structural Adhesive'
  },
  'TAC-R777': {
    name: 'TAC-R777 – Two-Part Modified Epoxy Adhesive',
    full_name: 'TAC-R777 – Two-Part Modified Epoxy Adhesive'
  },
  'TAC-R750': {
    name: 'TAC-R750 – Two-Part Methacrylate Adhesive',
    full_name: 'TAC-R750 – Two-Part Methacrylate Adhesive'
  },
  'T-OS150': {
    name: 'T-OS150 – High-Performance Semi-Self Leveling Hybrid Polymer Sealant',
    full_name: 'T-OS150 – High-Performance Semi-Self Leveling Hybrid Polymer Sealant'
  },
  'T-R682': {
    name: 'T-R682 – Epoxy Quick-Set Two-Part Adhesive',
    full_name: 'T-R682 – Epoxy Quick-Set Two-Part Adhesive'
  }
};

interface UpdateResult {
  productId: string;
  oldName: string;
  oldFullName: string;
  newName: string;
  newFullName: string;
  status: 'updated' | 'not_found' | 'error' | 'no_change';
  errorMessage?: string;
}

class ProductNameUpdater {
  private dryRun: boolean;
  private results: UpdateResult[] = [];
  private allProducts: any[] = [];

  constructor(dryRun: boolean = true) {
    this.dryRun = dryRun;
  }

  async execute(): Promise<void> {
    console.log('🔄 Updating product names for newly created products...');
    console.log(`API URL: ${API_BASE_URL}`);
    console.log(`Mode: ${this.dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be saved)'}\n`);

    try {
      console.log('📡 Fetching all products from Heroku API...');
      const response = await axios.get(`${API_BASE_URL}/products`);
      this.allProducts = Array.isArray(response.data) ? response.data : [];
      console.log(`📦 Found ${this.allProducts.length} products in database\n`);
    } catch (error) {
      console.warn('⚠️  Could not fetch all products, will try individual lookups');
      this.allProducts = [];
    }

    for (const [productId, nameData] of Object.entries(PRODUCT_NAME_MAP)) {
      let product = this.allProducts.find(
        p => p.product_id?.toUpperCase() === productId.toUpperCase()
      );

      if (!product) {
        try {
          const individualResponse = await axios.get(`${API_BASE_URL}/products/${productId}`, {
            timeout: 30000
          });
          if (individualResponse.data && individualResponse.data.product_id) {
            product = individualResponse.data;
          }
        } catch (error: any) {
          // Product not found
        }
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

      // Check if update is needed
      if (product.name === nameData.full_name && product.full_name === nameData.full_name) {
        console.log(`⏭️  ${productId}: Already has correct full name (no change needed)`);
        this.results.push({
          productId,
          oldName: product.name,
          oldFullName: product.full_name,
          newName: nameData.full_name,
          newFullName: nameData.full_name,
          status: 'no_change',
        });
        continue;
      }

      console.log(`\n📦 Found: ${product.product_id} - ${product.full_name || product.name}`);
      console.log(`   Current name: ${product.name}`);
      console.log(`   Current full_name: ${product.full_name}`);
      console.log(`   New name: ${nameData.full_name} (full name for card display)`);
      console.log(`   New full_name: ${nameData.full_name}`);

      this.results.push({
        productId: product.product_id || product.id,
        oldName: product.name,
        oldFullName: product.full_name,
        newName: nameData.full_name,
        newFullName: nameData.full_name,
        status: 'updated',
      });

      if (!this.dryRun) {
        try {
          const updateId = product.product_id || product.id;
          
          const updateResponse = await axios.put(
            `${API_BASE_URL}/products/${updateId}`,
            {
              name: nameData.full_name,
              full_name: nameData.full_name
            },
            {
              headers: {
                'Content-Type': 'application/json'
              },
              timeout: 30000
            }
          );

          if (updateResponse.data.success) {
            console.log(`   ✅ Updated successfully`);
          } else {
            throw new Error(updateResponse.data.message || 'Update failed');
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
          console.error(`   ❌ Error updating: ${errorMessage}`);
          this.results[this.results.length - 1].status = 'error';
          this.results[this.results.length - 1].errorMessage = errorMessage;
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
    const noChange = this.results.filter(r => r.status === 'no_change');
    const notFound = this.results.filter(r => r.status === 'not_found');
    const errors = this.results.filter(r => r.status === 'error');

    console.log(`\n✅ Successfully ${this.dryRun ? 'would update' : 'updated'}: ${updated.length}`);
    console.log(`⏭️  No change needed: ${noChange.length}`);
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

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

