import axios from 'axios';

const API_BASE_URL = 'https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api';

// Products to publish
const PRODUCTS_TO_PUBLISH = [
  'T205'
];

// Products to unpublish (newly created/scraped products only)
// Note: Excluding products that already existed and we just updated (like T215, T220, T350, T464, T715)
const PRODUCTS_TO_UNPUBLISH = [
  '81-0389', 'A450', 'A465', 'A729', 'C110', 'C805', 'C830', 'C835',
  'H103', 'H117', 'H158', 'H163', 'H164', 'H167', 'H176',
  'IC936', 'IC951', 'IC952', 'IC955NF',
  'OA28', 'OA29', 'OS61', 'OS35', 'OS37', 'OSA',
  'R160', 'R190', 'R221', 'R519', 'S228',
  'T305', 'T310', 'T449', 'T465', 'T532',
  'W700', 'CA2400', 'CA1500',
  'M-C283', 'MC736', 'MC739', 'M-R478', 'M-S750',
  'TAC-735R', 'TAC-OS7', 'TAC-OS74', 'TAC-R777', 'TAC-R750',
  'TC471', 'T-OS150', 'T-R682', 'C-S538', 'R-OSA'
];

interface UpdateResult {
  productId: string;
  status: 'published' | 'unpublished' | 'not_found' | 'error';
  errorMessage?: string;
}

class PublishedStatusUpdater {
  private dryRun: boolean;
  private results: UpdateResult[] = [];
  private allProducts: any[] = [];

  constructor(dryRun: boolean = true) {
    this.dryRun = dryRun;
  }

  async execute(): Promise<void> {
    console.log('🔄 Updating product published status...');
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

    // Publish products
    console.log('📢 Publishing products...\n');
    for (const productId of PRODUCTS_TO_PUBLISH) {
      await this.updateProductStatus(productId, true);
    }

    // Unpublish products
    console.log('\n📴 Unpublishing newly created products...\n');
    for (const productId of PRODUCTS_TO_UNPUBLISH) {
      // Skip T205 since we're publishing it
      if (productId === 'T205') continue;
      await this.updateProductStatus(productId, false);
    }

    this.printSummary();
  }

  private async updateProductStatus(productId: string, publish: boolean): Promise<void> {
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
        status: 'not_found'
      });
      return;
    }

    const currentStatus = product.published ? 'Published' : 'Unpublished';
    const newStatus = publish ? 'Published' : 'Unpublished';
    const action = publish ? 'Publish' : 'Unpublish';

    // Check if already in desired state
    if (product.published === publish) {
      console.log(`⏭️  ${productId}: Already ${newStatus.toLowerCase()} (no change needed)`);
      this.results.push({
        productId,
        status: publish ? 'published' : 'unpublished'
      });
      return;
    }

    console.log(`📦 ${productId}: ${product.name || product.full_name}`);
    console.log(`   Current: ${currentStatus}`);
    console.log(`   New: ${newStatus}`);

    if (!this.dryRun) {
      try {
        const updateId = product.product_id || product.id;
        
        const updateResponse = await axios.put(
          `${API_BASE_URL}/products/${updateId}`,
          {
            published: publish
          },
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        if (updateResponse.data.success) {
          console.log(`   ✅ ${action}ed successfully`);
          this.results.push({
            productId,
            status: publish ? 'published' : 'unpublished'
          });
        } else {
          throw new Error(updateResponse.data.message || 'Update failed');
        }
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
        console.error(`   ❌ Error: ${errorMessage}`);
        this.results.push({
          productId,
          status: 'error',
          errorMessage: errorMessage
        });
      }
    } else {
      console.log(`   ⏭️  Would ${action.toLowerCase()} (dry run)`);
      this.results.push({
        productId,
        status: publish ? 'published' : 'unpublished'
      });
    }
  }

  private printSummary(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 UPDATE SUMMARY');
    console.log('='.repeat(80));

    const published = this.results.filter(r => r.status === 'published');
    const unpublished = this.results.filter(r => r.status === 'unpublished');
    const notFound = this.results.filter(r => r.status === 'not_found');
    const errors = this.results.filter(r => r.status === 'error');

    console.log(`\n✅ Successfully ${this.dryRun ? 'would publish' : 'published'}: ${published.length}`);
    console.log(`❌ Successfully ${this.dryRun ? 'would unpublish' : 'unpublished'}: ${unpublished.length}`);
    console.log(`⚠️  Not found: ${notFound.length}`);
    console.log(`❌ Errors: ${errors.length}`);

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

  const updater = new PublishedStatusUpdater(dryRun);
  await updater.execute();

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

