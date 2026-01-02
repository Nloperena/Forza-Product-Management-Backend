import axios from 'axios';

const API_BASE_URL = 'https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api';

// Product name mappings: product_id -> { name, full_name }
const PRODUCT_NAME_MAP: Record<string, { name: string; full_name: string }> = {
  'IC933': {
    name: 'IC933',
    full_name: 'IC933 – CA Compliant Multi-Purpose Contact Adhesive'
  },
  'IC934': {
    name: 'IC934',
    full_name: 'IC934 – Semi-Pressure Sensitive Web Spray'
  },
  'IC946': {
    name: 'IC946',
    full_name: 'IC946 – CA Compliant Pressure-Sensitive Contact Adhesive'
  },
  'MC739': {
    name: 'MC739',
    full_name: 'MC739 – Mist Spray Adhesive for Fiberglass Infusion Molding'
  },
  'MC722': {
    name: 'MC722',
    full_name: 'MC722 – Web Spray Adhesive for Marine Infusion Molding'
  },
  'C130': {
    name: 'C130',
    full_name: 'C130 – High Heat Neoprene Adhesive'
  },
  'C150': {
    name: 'C150',
    full_name: 'C150 – CA-Compliant High Solids Contact Adhesive'
  },
  'C331': {
    name: 'C331',
    full_name: 'C331 – Non-Flammable Contact Adhesive'
  },
  'FRP': {
    name: 'FRP',
    full_name: 'FRP – Rollable Adhesive'
  },
  'I1000': {
    name: 'I1000',
    full_name: 'I1000 – Low-Medium Viscosity Laminating Adhesive'
  },
  'OA4': {
    name: 'OA4',
    full_name: 'OA4 – High-Strength Moisture Cure Eco-Friendly Adhesive / Sealant'
  },
  'OA75': {
    name: 'OA75',
    full_name: 'OA75 – Trowellable Flooring Adhesive'
  },
  'OA99': {
    name: 'OA99',
    full_name: 'OA99 – Bonding Putty'
  },
  'OSA': {
    name: 'OSA',
    full_name: 'OSA – Adhesive Primer and Promoter'
  },
  'OS24': {
    name: 'OS24',
    full_name: 'OS24 – High-Strength Moisture-Cure Single-Part Thixotropic Structural Adhesive / Sealant'
  },
  'R160': {
    name: 'R160',
    full_name: 'R160 – Epoxy Quick-Set High Strength Tack Strength Adhesive'
  },
  'R221': {
    name: 'R221',
    full_name: 'R221 – Two-Part 1:1 Modified Epoxy Adhesive'
  },
  'R519': {
    name: 'R519',
    full_name: 'R519 – Fast Acting Two-Part Methacrylate Adhesive'
  },
  'R529': {
    name: 'R529',
    full_name: 'R529 – Structural Anchoring Epoxy'
  },
  'FC-CAR': {
    name: 'FC-CAR',
    full_name: 'FC-CAR – Citrus-Based Adhesive Remover / Cleaner'
  },
  'S228': {
    name: 'S228',
    full_name: 'S228 – Adhesive Primer and Promoter'
  },
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
  private dryRun: boolean;
  private results: UpdateResult[] = [];
  private allProducts: any[] = [];

  constructor(dryRun: boolean = true) {
    this.dryRun = dryRun;
  }

  async execute(): Promise<void> {
    console.log('🔄 Updating product names via Heroku API...');
    console.log(`API URL: ${API_BASE_URL}`);
    console.log(`Mode: ${this.dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be saved)'}\n`);

    try {
      // Fetch all products from the API (for reference)
      console.log('📡 Fetching products from Heroku API...');
      try {
        const response = await axios.get(`${API_BASE_URL}/products`);
        this.allProducts = Array.isArray(response.data) ? response.data : [];
        console.log(`📦 Found ${this.allProducts.length} products in initial fetch\n`);
      } catch (error) {
        console.warn('⚠️  Could not fetch all products, will try individual lookups');
        this.allProducts = [];
      }

      // Process each product
      for (const [productId, nameData] of Object.entries(PRODUCT_NAME_MAP)) {
        // First try to find in the fetched list
        let product = this.allProducts.find(
          p => p.product_id === productId
        );

        // If not found, try case-insensitive match in list
        if (!product) {
          product = this.allProducts.find(
            p => p.product_id?.toUpperCase() === productId.toUpperCase()
          );
        }

        // If still not found, try fetching individually by product_id
        if (!product) {
          try {
            console.log(`   🔍 Looking up ${productId} individually...`);
            const individualResponse = await axios.get(`${API_BASE_URL}/products/${productId}`, {
              timeout: 30000
            });
            if (individualResponse.data && individualResponse.data.product_id) {
              product = individualResponse.data;
            }
          } catch (error: any) {
            // Product not found individually, will continue to not_found
          }
        }

        // If still not found, try normalized match (remove dashes) in list
        if (!product) {
          const normalizedSearchId = productId.toUpperCase().replace(/-/g, '');
          product = this.allProducts.find(
            p => {
              const pId = p.product_id?.toUpperCase() || '';
              const normalizedPId = pId.replace(/-/g, '');
              return normalizedPId === normalizedSearchId;
            }
          );
        }

        // If still not found, try lowercase match in list
        if (!product) {
          product = this.allProducts.find(
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
        console.log(`   New name: ${nameData.full_name} (full name for card display)`);
        console.log(`   New full_name: ${nameData.full_name}`);

        this.results.push({
          productId: product.product_id || product.id,
          oldName: product.name,
          oldFullName: product.full_name,
          newName: nameData.full_name, // Set to full_name for card display
          newFullName: nameData.full_name,
          status: 'updated',
        });

        if (!this.dryRun) {
          try {
            // Use product_id for update (more reliable than numeric id)
            const updateId = product.product_id || product.id;
            
            // Set name to full_name so cards display the full name
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
                timeout: 30000 // 30 second timeout for Heroku
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
    } catch (error: any) {
      console.error('❌ Fatal error:', error.message);
      if (error.response) {
        console.error('   Response status:', error.response.status);
        console.error('   Response data:', error.response.data);
      }
      throw error;
    }
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

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

