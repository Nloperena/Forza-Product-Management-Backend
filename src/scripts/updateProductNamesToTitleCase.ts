import { ProductModel } from '../models/Product';
import { databaseService } from '../services/database';

// Helper function to convert to title case
function toTitleCase(str: string): string {
  // Short acronyms that should stay uppercase (2-3 letters, all caps)
  const shortAcronyms = ['CA', 'FRP', 'VOC', 'PU', 'MS', 'HPL', 'PSA'];
  
  // Product code pattern: starts with letters, contains numbers
  const isProductCode = (word: string): boolean => {
    const clean = word.replace(/[–—\-]/g, '');
    // Product codes: have numbers (like IC933, MC722, C130, OA4, OS24, R160, etc.)
    return /^[A-Z0-9]*[0-9][A-Z0-9]*$/i.test(clean) && clean.length <= 6;
  };
  
  return str
    .split(' ')
    .map((word, index) => {
      // Remove any trailing punctuation for matching
      const cleanWord = word.replace(/[–—\-]/g, '');
      
      // Handle hyphenated words
      if (word.includes('-') && !word.startsWith('–') && !word.startsWith('—')) {
        return word
          .split('-')
          .map(part => {
            // Keep short acronyms uppercase
            const upperPart = part.toUpperCase();
            if (shortAcronyms.includes(upperPart)) {
              return part.toUpperCase();
            }
            // Capitalize first letter, lowercase rest
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
          })
          .join('-');
      }
      
      // Keep product codes uppercase (only if they contain numbers or are very short)
      if (isProductCode(cleanWord)) {
        return word.toUpperCase();
      }
      
      // Keep short acronyms uppercase
      const upperWord = cleanWord.toUpperCase();
      if (shortAcronyms.includes(upperWord)) {
        return word.toUpperCase();
      }
      
      // Standard title case: capitalize first letter, lowercase rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

// Product name mappings: product_id -> new title-cased name
// Extracted from HTML and converted to title case
const PRODUCT_NAME_MAP: Record<string, { name: string; full_name: string }> = {
  'IC933': {
    name: 'IC933',
    full_name: toTitleCase('IC933 – CA COMPLIANT MULTI-PURPOSE CONTACT ADHESIVE')
  },
  'IC934': {
    name: 'IC934',
    full_name: toTitleCase('IC934 – SEMI-PRESSURE SENSITIVE WEB SPRAY')
  },
  'IC946': {
    name: 'IC946',
    full_name: toTitleCase('IC946 – CA COMPLIANT PRESSURE-SENSITIVE CONTACT ADHESIVE')
  },
  'MC739': {
    name: 'MC739',
    full_name: toTitleCase('MC739 – MIST SPRAY ADHESIVE FOR FIBERGLASS INFUSION MOLDING')
  },
  'MC722': {
    name: 'MC722',
    full_name: toTitleCase('MC722 – WEB SPRAY ADHESIVE FOR MARINE INFUSION MOLDING')
  },
  'C130': {
    name: 'C130',
    full_name: toTitleCase('C130 – HIGH HEAT NEOPRENE ADHESIVE')
  },
  'C150': {
    name: 'C150',
    full_name: toTitleCase('C150 – CA-COMPLIANT HIGH SOLIDS CONTACT ADHESIVE')
  },
  'C331': {
    name: 'C331',
    full_name: toTitleCase('C331 – NON-FLAMMABLE CONTACT ADHESIVE')
  },
  'FRP': {
    name: 'FRP',
    full_name: toTitleCase('FRP – ROLLABLE ADHESIVE')
  },
  'I1000': {
    name: 'I1000',
    full_name: toTitleCase('I1000 – LOW-MEDIUM VISCOSITY LAMINATING ADHESIVE')
  },
  'OA4': {
    name: 'OA4',
    full_name: toTitleCase('OA4 – HIGH-STRENGTH MOISTURE CURE ECO-FRIENDLY ADHESIVE / SEALANT')
  },
  'OA75': {
    name: 'OA75',
    full_name: toTitleCase('OA75 – TROWELLABLE FLOORING ADHESIVE')
  },
  'OA99': {
    name: 'OA99',
    full_name: toTitleCase('OA99 – BONDING PUTTY')
  },
  'OSA': {
    name: 'OSA',
    full_name: toTitleCase('OSA – ADHESIVE PRIMER AND PROMOTER')
  },
  'OS24': {
    name: 'OS24',
    full_name: toTitleCase('OS24 – HIGH-STRENGTH MOISTURE-CURE SINGLE-PART THIXOTROPIC STRUCTURAL ADHESIVE / SEALANT')
  },
  'R160': {
    name: 'R160',
    full_name: toTitleCase('R160 – EPOXY QUICK-SET HIGH STRENGTH TACK STRENGTH ADHESIVE')
  },
  'R221': {
    name: 'R221',
    full_name: toTitleCase('R221 – TWO-PART 1:1 MODIFIED EPOXY ADHESIVE')
  },
  'R519': {
    name: 'R519',
    full_name: toTitleCase('R519 – FAST ACTING TWO-PART METHACRYLATE ADHESIVE')
  },
  'R529': {
    name: 'R529',
    full_name: toTitleCase('R529 – STRUCTURAL ANCHORING EPOXY')
  },
  'FC-CAR': {
    name: 'FC-CAR',
    full_name: toTitleCase('FC-CAR – CITRUS-BASED ADHESIVE REMOVER / CLEANER')
  },
  'S228': {
    name: 'S228',
    full_name: toTitleCase('S228 – ADHESIVE PRIMER AND PROMOTER')
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
    console.log('🔄 Updating product names to title case...');
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

