import axios from 'axios';
import fs from 'fs';
import path from 'path';

const API_BASE_URL = 'https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api';
const CSV_FILE_PATH = 'C:\\Users\\nimro\\Downloads\\Chemistries Products for Website Database v3(Use This Nico - Chemistries).csv';

interface ChemistryMapping {
  productId: string;
  chemistry: string;
  industry: string;
}

interface UpdateResult {
  productId: string;
  oldChemistry: string;
  newChemistry: string;
  status: 'updated' | 'not_found' | 'error' | 'no_change';
  errorMessage?: string;
}

class ChemistryUpdater {
  private dryRun: boolean;
  private chemistryMap: Map<string, ChemistryMapping> = new Map();
  private results: UpdateResult[] = [];
  private allProducts: any[] = [];

  constructor(dryRun: boolean = true) {
    this.dryRun = dryRun;
  }

  private parseCSV(): void {
    console.log('📖 Reading CSV file...');
    const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const lines = csvContent.split('\n');

    // Skip header lines (first 3 lines)
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line === '') continue;

      // Parse CSV line (handle commas within quoted fields)
      const parts = this.parseCSVLine(line);
      if (parts.length < 3) continue;

      const industry = parts[0].trim();
      const productId = parts[1].trim();
      const chemistry = parts[2].trim();

      // Skip if product ID is N/A or empty
      if (!productId || productId === 'N/A' || productId === '') continue;

      // Skip if chemistry is empty
      if (!chemistry || chemistry === '') continue;

      // Store mapping (use uppercase for consistency)
      const key = productId.toUpperCase();
      this.chemistryMap.set(key, {
        productId: productId,
        chemistry: chemistry,
        industry: industry
      });
    }

    console.log(`✅ Parsed ${this.chemistryMap.size} product chemistry mappings from CSV\n`);
  }

  private parseCSVLine(line: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current !== '') {
      parts.push(current);
    }

    return parts;
  }

  async execute(): Promise<void> {
    console.log('🔄 Updating product chemistries from CSV...');
    console.log(`API URL: ${API_BASE_URL}`);
    console.log(`CSV File: ${CSV_FILE_PATH}`);
    console.log(`Mode: ${this.dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be saved)'}\n`);

    // Parse CSV
    this.parseCSV();

    // Fetch all products from API
    try {
      console.log('📡 Fetching all products from Heroku API...');
      const response = await axios.get(`${API_BASE_URL}/products`);
      this.allProducts = Array.isArray(response.data) ? response.data : [];
      console.log(`📦 Found ${this.allProducts.length} products in database\n`);
    } catch (error) {
      console.warn('⚠️  Could not fetch all products, will try individual lookups');
      this.allProducts = [];
    }

    // Process each chemistry mapping
    for (const [key, mapping] of this.chemistryMap.entries()) {
      // Find product by product_id
      let product = this.allProducts.find(
        p => p.product_id?.toUpperCase() === key
      );

      // If not found, try fetching individually
      if (!product) {
        try {
          const individualResponse = await axios.get(`${API_BASE_URL}/products/${mapping.productId}`, {
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
        console.log(`❌ Product "${mapping.productId}" not found in database`);
        this.results.push({
          productId: mapping.productId,
          oldChemistry: 'N/A',
          newChemistry: mapping.chemistry,
          status: 'not_found',
        });
        continue;
      }

      const currentChemistry = product.chemistry || 'N/A';
      const newChemistry = mapping.chemistry;

      // Check if update is needed
      if (currentChemistry === newChemistry) {
        console.log(`⏭️  ${mapping.productId}: Already has chemistry "${newChemistry}" (no change needed)`);
        this.results.push({
          productId: mapping.productId,
          oldChemistry: currentChemistry,
          newChemistry: newChemistry,
          status: 'no_change',
        });
        continue;
      }

      console.log(`\n📦 Found: ${mapping.productId} - ${product.name || product.full_name}`);
      console.log(`   Current chemistry: ${currentChemistry}`);
      console.log(`   New chemistry: ${newChemistry}`);

      this.results.push({
        productId: mapping.productId,
        oldChemistry: currentChemistry,
        newChemistry: newChemistry,
        status: 'updated',
      });

      if (!this.dryRun) {
        try {
          const updateId = product.product_id || product.id;
          
          const updateResponse = await axios.put(
            `${API_BASE_URL}/products/${updateId}`,
            {
              chemistry: newChemistry
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

  // Check if CSV file exists
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`❌ ERROR: CSV file not found at: ${CSV_FILE_PATH}`);
    console.error('   Please ensure the CSV file is in the correct location.');
    process.exit(1);
  }

  const updater = new ChemistryUpdater(dryRun);
  await updater.execute();

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

