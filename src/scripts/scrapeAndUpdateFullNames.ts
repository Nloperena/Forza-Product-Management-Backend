import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const API_BASE_URL = 'https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api';
const BASE_URL = 'https://forzabuilt.com/product';
const JSON_FILE_PATH = path.join(__dirname, '../../data/forza_products_organized.json');

// Products that need full names
const PRODUCTS_TO_UPDATE = [
  'A450', 'A465', 'A729', 'C110', 'C805', 'C830', 'C835',
  'H103', 'H117', 'H158', 'H163', 'H164', 'H167', 'H176',
  'IC936', 'IC951', 'IC952', 'IC955NF',
  'OA28', 'OA29',
  'T305', 'T310', 'T449', 'T465', 'T532',
  'W700', 'CA2400', 'CA1500',
  'M-C283', 'MC736', 'MC739', 'M-R478'
];

interface UpdateResult {
  productId: string;
  oldName: string;
  newName: string;
  status: 'updated' | 'not_found' | 'error' | 'no_change';
  errorMessage?: string;
}

class FullNameScraper {
  private dryRun: boolean;
  private results: UpdateResult[] = [];

  constructor(dryRun: boolean = true) {
    this.dryRun = dryRun;
  }

  private findProductInJSON(productId: string): any | null {
    try {
      const jsonContent = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
      const data = JSON.parse(jsonContent);
      
      // Recursively search for product
      function searchProducts(obj: any): any | null {
        if (Array.isArray(obj)) {
          for (const item of obj) {
            const found = searchProducts(item);
            if (found) return found;
          }
        } else if (obj !== null && typeof obj === 'object') {
          if (obj.product_id && obj.product_id.toUpperCase() === productId.toUpperCase()) {
            return obj;
          }
          for (const key in obj) {
            const found = searchProducts(obj[key]);
            if (found) return found;
          }
        }
        return null;
      }
      
      return searchProducts(data);
    } catch (error) {
      return null;
    }
  }

  private async scrapeFullName(productId: string): Promise<string | null> {
    // First, try to find in JSON file
    const jsonProduct = this.findProductInJSON(productId);
    if (jsonProduct) {
      const name = jsonProduct.full_name || jsonProduct.name;
      if (name && name.includes('–')) {
        // Clean up the name
        let fullName = name.trim();
        // Remove brand prefixes if they're redundant
        fullName = fullName
          .replace(/^ForzaBOND®\s*/i, '')
          .replace(/^ForzaSEAL®\s*/i, '')
          .replace(/^ForzaTAPE®\s*/i, '')
          .trim();
        
        // Ensure it starts with product ID
        if (!fullName.toUpperCase().startsWith(productId.toUpperCase())) {
          const idIndex = fullName.toUpperCase().indexOf(productId.toUpperCase());
          if (idIndex >= 0) {
            fullName = fullName.substring(idIndex).trim();
          } else {
            fullName = `${productId} – ${fullName}`;
          }
        }
        return fullName;
      }
    }

    // If not in JSON, try scraping from website
    try {
      // Try different URL formats
      const urlFormats = [
        `${BASE_URL}/${productId.toLowerCase()}/`,
        `${BASE_URL}/${productId}/`,
        `${BASE_URL}/${productId.replace(/-/g, '').toLowerCase()}/`
      ];

      let html: string | null = null;

      for (const url of urlFormats) {
        try {
          const response = await axios.get(url, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          html = response.data;
          break;
        } catch (error) {
          // Try next URL format
          continue;
        }
      }

      if (!html) {
        return null;
      }

      const $ = cheerio.load(html);

      // Try to find the product title/name in various locations
      let fullName = '';

      // Method 1: Look for h1 with product name
      const h1 = $('h1').first().text().trim();
      if (h1 && h1.includes(productId.toUpperCase())) {
        fullName = h1;
      }

      // Method 2: Look for product title class
      if (!fullName) {
        const productTitle = $('.product-title, .product-name, .entry-title').first().text().trim();
        if (productTitle && productTitle.includes(productId.toUpperCase())) {
          fullName = productTitle;
        }
      }

      // Method 3: Look in breadcrumbs or page title
      if (!fullName) {
        const breadcrumb = $('.breadcrumb, .breadcrumbs').text();
        const match = breadcrumb.match(new RegExp(`${productId}[^\\n]*`, 'i'));
        if (match) {
          fullName = match[0].trim();
        }
      }

      // Method 4: Look for meta title
      if (!fullName) {
        const metaTitle = $('title').text().trim();
        if (metaTitle && metaTitle.includes(productId.toUpperCase())) {
          fullName = metaTitle.split('|')[0].trim(); // Take part before pipe
        }
      }

      // Method 5: Look for any heading that contains the product ID
      if (!fullName) {
        $('h1, h2, h3, .title, .name').each((_, el): boolean => {
          const text = $(el).text().trim();
          if (text.includes(productId.toUpperCase()) && text.length > productId.length + 5) {
            fullName = text;
            return false; // Break
          }
          return true;
        });
      }

      // If no full name found, return null
      if (!fullName) {
        return null;
      }

      // Clean up the name - remove brand prefixes if they're redundant
      // Remove common prefixes that might be redundant
      fullName = fullName
        .replace(/^ForzaBOND®\s*/i, '')
        .replace(/^ForzaSEAL®\s*/i, '')
        .replace(/^ForzaTAPE®\s*/i, '')
        .trim();
      
      // Ensure it starts with product ID
      if (!fullName.toUpperCase().startsWith(productId.toUpperCase())) {
        // Try to find where product ID appears and take everything from there
        const idIndex = fullName.toUpperCase().indexOf(productId.toUpperCase());
        if (idIndex >= 0) {
          fullName = fullName.substring(idIndex).trim();
        } else {
          // If product ID not found, prepend it
          fullName = `${productId} – ${fullName}`;
        }
      }
      
      return fullName;
    } catch (error: any) {
      console.error(`   ❌ Error scraping ${productId}:`, error.message);
      return null;
    }
  }

  async execute(): Promise<void> {
    console.log('🕷️  Scraping full names from forzabuilt.com...');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be saved)'}\n`);

    for (const productId of PRODUCTS_TO_UPDATE) {
      console.log(`\n🔍 Scraping ${productId}...`);

      // First, get current product from API
      let product;
      try {
        const response = await axios.get(`${API_BASE_URL}/products/${productId}`, {
          timeout: 30000
        });
        product = response.data;
      } catch (error: any) {
        console.log(`   ❌ Product "${productId}" not found in database`);
        this.results.push({
          productId,
          oldName: 'N/A',
          newName: 'N/A',
          status: 'not_found',
        });
        continue;
      }

      const oldName = product.name || product.full_name || 'N/A';
      console.log(`   Current name: "${oldName}"`);

      // Scrape full name from website
      const scrapedFullName = await this.scrapeFullName(productId);

      if (!scrapedFullName) {
        console.log(`   ❌ Could not scrape full name for ${productId}`);
        this.results.push({
          productId,
          oldName: oldName,
          newName: oldName,
          status: 'not_found',
        });
        continue;
      }

      // Check if update is needed
      if (oldName === scrapedFullName) {
        console.log(`   ⏭️  Already has correct name (no change needed)`);
        this.results.push({
          productId,
          oldName: oldName,
          newName: scrapedFullName,
          status: 'no_change',
        });
        continue;
      }

      console.log(`   ✅ Scraped full name: "${scrapedFullName}"`);

      if (!this.dryRun) {
        try {
          const updateId = product.product_id || product.id;
          
          const updateResponse = await axios.put(
            `${API_BASE_URL}/products/${updateId}`,
            {
              name: scrapedFullName,
              full_name: scrapedFullName
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
            this.results.push({
              productId,
              oldName: oldName,
              newName: scrapedFullName,
              status: 'updated',
            });
          } else {
            throw new Error(updateResponse.data.message || 'Update failed');
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
          console.error(`   ❌ Error updating: ${errorMessage}`);
          this.results.push({
            productId,
            oldName: oldName,
            newName: scrapedFullName,
            status: 'error',
            errorMessage: errorMessage
          });
        }
      } else {
        console.log(`   ⏭️  Would update (dry run)`);
        this.results.push({
          productId,
          oldName: oldName,
          newName: scrapedFullName,
          status: 'updated',
        });
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
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

    if (updated.length > 0) {
      console.log('\n📋 Products that would be updated:');
      updated.forEach(r => {
        console.log(`   ${r.productId}: "${r.oldName}" → "${r.newName}"`);
      });
    }

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

  const scraper = new FullNameScraper(dryRun);
  await scraper.execute();

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

