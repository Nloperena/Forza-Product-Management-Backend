import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const API_BASE_URL = 'https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api';
const CSV_FILE_PATH = 'C:\\Users\\nimro\\Downloads\\Chemistries Products for Website Database v3(Use This Nico - Chemistries).csv';
const JSON_FILE_PATH = path.join(__dirname, '../../data/forza_products_organized.json');
const BASE_URL = 'https://forzabuilt.com/product';

interface MissingProduct {
  productId: string;
  chemistry: string;
  industry: string;
}

interface ScrapedProduct {
  product_id: string;
  name: string;
  full_name: string;
  description: string;
  brand: string;
  industry: string;
  chemistry: string;
  url: string;
  image?: string;
  benefits: string[];
  applications: string[];
  technical: Array<{ property: string; value: string; unit?: string }>;
  sizing?: string[];
  published: boolean;
}

interface Result {
  productId: string;
  status: 'scraped_and_created' | 'scraped_failed' | 'create_failed' | 'not_found';
  errorMessage?: string;
}

class MissingProductScraper {
  private dryRun: boolean;
  private missingProducts: MissingProduct[] = [];
  private results: Result[] = [];

  constructor(dryRun: boolean = true) {
    this.dryRun = dryRun;
  }

  private parseCSVForMissing(): void {
    console.log('📖 Reading CSV file to find missing products...');
    const csvContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const lines = csvContent.split('\n');

    // List of products that were not found in the database
    const missingProductIds = [
      '81-0389', 'IC2400', 'A1000', 'A450', 'A465', 'A729', 'C110', 'C805', 'C830', 'C835',
      'H103', 'H117', 'H158', 'H163', 'H164', 'H167', 'H176', 'IC936', 'IC951', 'IC952',
      'IC955NF', 'OA28', 'OA29', 'OS61', 'OS35', 'OS37', 'OSA', 'R160', 'R190', 'R221',
      'R519', 'S228', 'T205', 'T215', 'T220', 'T305', 'T310', 'T350', 'T446', 'T449',
      'T454', 'T462', 'T464', 'T465', 'T515', 'T532', 'T715', 'W700', 'CA2400', 'CA1500',
      'T103', 'FC-CAR-AA', 'T226', 'M-C283', 'MC736', 'MC739', 'M-R478', 'M-S750',
      'TAC-735R', 'TAC-850GR', 'TAC-OS7', 'TAC-OS74', 'TAC-R760', 'TAC-R777', 'TAC-R750',
      'TAC-T700', 'TAC-745', 'TC471', 'T-OS150', 'T-OS152', 'T-R682', 'T-T1420 (extreme seal)',
      'T-T246', 'CC515  / TU615', 'CC503 / TU603', 'C-OA52W', 'TU-OS50', 'C-OS9/TU-OA40',
      'TU-OS45', 'C-S538', 'TU-800', 'RC866', 'R-OSA'
    ];

    // Parse CSV to get chemistry mappings
    const chemistryMap = new Map<string, { chemistry: string; industry: string }>();
    
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line === '') continue;

      const parts = this.parseCSVLine(line);
      if (parts.length < 3) continue;

      const industry = parts[0].trim();
      const productId = parts[1].trim();
      const chemistry = parts[2].trim();

      if (!productId || productId === 'N/A' || productId === '' || !chemistry || chemistry === '') {
        continue;
      }

      chemistryMap.set(productId.toUpperCase(), { chemistry, industry });
    }

    // Find missing products with their chemistries
    for (const productId of missingProductIds) {
      const key = productId.toUpperCase();
      const mapping = chemistryMap.get(key);
      if (mapping) {
        this.missingProducts.push({
          productId: productId,
          chemistry: mapping.chemistry,
          industry: this.mapIndustryToDatabase(mapping.industry)
        });
      } else {
        // Still add it, we'll try to determine industry from scraping
        this.missingProducts.push({
          productId: productId,
          chemistry: '',
          industry: 'industrial_industry' // default
        });
      }
    }

    console.log(`✅ Found ${this.missingProducts.length} missing products to scrape\n`);
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
    if (current !== '') parts.push(current);
    return parts;
  }

  private mapIndustryToDatabase(industry: string): string {
    const mapping: Record<string, string> = {
      'Industrial': 'industrial_industry',
      'Marine': 'marine_industry',
      'Composites': 'composites_industry',
      'Transportation': 'transportation_industry',
      'Construction': 'construction_industry',
      'Insulation': 'insulation_industry'
    };
    return mapping[industry] || 'industrial_industry';
  }

  private determineBrand(productId: string, name: string): string {
    const id = productId.toUpperCase();
    if (id.startsWith('IC') || id.startsWith('C') || id.startsWith('MC') || id.startsWith('M-C') || 
        id.startsWith('T-C') || id.startsWith('TC') || id.startsWith('CC') || id.startsWith('CA') ||
        id.startsWith('R-C') || id.startsWith('RC') || id.startsWith('R-A') || id.startsWith('H') ||
        id.startsWith('A') || id.startsWith('W') || id.startsWith('FC-CAR') || id.match(/^\d/)) {
      return 'forza_bond';
    }
    if (id.startsWith('OS') || id.startsWith('OA') || id.startsWith('OSA') || id.startsWith('C-OS') ||
        id.startsWith('C-OA') || id.startsWith('M-OS') || id.startsWith('M-OA') || id.startsWith('T-OS') ||
        id.startsWith('T-OA') || id.startsWith('R-OS') || id.startsWith('TAC-OS') || id.startsWith('TU-OS')) {
      return 'forza_seal';
    }
    if (id.startsWith('T') || id.startsWith('T-') || id.startsWith('C-T') || id.startsWith('M-T') ||
        id.startsWith('R-T') || id.startsWith('TAC-T')) {
      return 'forza_tape';
    }
    if (name.toLowerCase().includes('bond')) return 'forza_bond';
    if (name.toLowerCase().includes('seal')) return 'forza_seal';
    if (name.toLowerCase().includes('tape')) return 'forza_tape';
    return 'forza_bond';
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

  private convertJSONProductToScraped(jsonProduct: any, chemistry: string, industry: string): ScrapedProduct {
    return {
      product_id: jsonProduct.product_id,
      name: jsonProduct.name || jsonProduct.product_id,
      full_name: jsonProduct.full_name || jsonProduct.name || jsonProduct.product_id,
      description: jsonProduct.description || '',
      brand: jsonProduct.brand || this.determineBrand(jsonProduct.product_id, jsonProduct.name || ''),
      industry: industry,
      chemistry: chemistry,
      url: jsonProduct.url || `${BASE_URL}/${jsonProduct.product_id.toLowerCase()}/`,
      image: jsonProduct.image || '',
      benefits: jsonProduct.benefits || [],
      applications: jsonProduct.instructions || jsonProduct.applications || [],
      technical: jsonProduct.technical || [],
      sizing: jsonProduct.sizing || undefined,
      published: jsonProduct.published !== undefined ? jsonProduct.published : true
    };
  }

  private async scrapeProduct(productId: string): Promise<ScrapedProduct | null> {
    try {
      // Try different URL formats
      const urlFormats = [
        `${BASE_URL}/${productId.toLowerCase()}/`,
        `${BASE_URL}/${productId}/`,
        `${BASE_URL}/${productId.replace(/-/g, '').toLowerCase()}/`
      ];

      let html: string | null = null;
      let finalUrl = '';

      for (const url of urlFormats) {
        try {
          const response = await axios.get(url, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          html = response.data;
          finalUrl = url;
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

      // Extract product information
      const name = $('h1').first().text().trim() || $('.product-title').text().trim() || '';
      const description = $('.product-description').text().trim() || 
                         $('meta[name="description"]').attr('content') || 
                         $('p').first().text().trim() || '';

      // Extract benefits
      const benefits: string[] = [];
      $('.benefits li, .benefit-item, ul.benefits li').each((_, el) => {
        const text = $(el).text().trim();
        if (text) benefits.push(text);
      });

      // Extract applications/instructions
      const applications: string[] = [];
      $('.applications li, .instructions li, .application-item').each((_, el) => {
        const text = $(el).text().trim();
        if (text) applications.push(text);
      });

      // Extract technical properties
      const technical: Array<{ property: string; value: string; unit?: string }> = [];
      $('.technical-properties tr, .specs tr').each((_, el) => {
        const property = $(el).find('td:first-child, th:first-child').text().trim();
        const value = $(el).find('td:last-child').text().trim();
        if (property && value) {
          technical.push({ property, value });
        }
      });

      // Extract sizing
      const sizing: string[] = [];
      $('.sizing li, .sizes li').each((_, el) => {
        const text = $(el).text().trim();
        if (text) sizing.push(text);
      });

      // Extract image
      const image = $('.product-image img, .product-gallery img').first().attr('src') || 
                   $('meta[property="og:image"]').attr('content') || '';

      const brand = this.determineBrand(productId, name);

      return {
        product_id: productId,
        name: name || productId,
        full_name: name || productId,
        description: description || '',
        brand: brand,
        industry: 'industrial_industry', // Will be updated from CSV
        chemistry: '', // Will be updated from CSV
        url: finalUrl,
        image: image,
        benefits: benefits,
        applications: applications,
        technical: technical,
        sizing: sizing.length > 0 ? sizing : undefined,
        published: true
      };
    } catch (error: any) {
      console.error(`   ❌ Error scraping ${productId}:`, error.message);
      return null;
    }
  }

  async execute(): Promise<void> {
    console.log('🕷️  Scraping missing products from forzabuilt.com...');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (products will be created)'}\n`);

    this.parseCSVForMissing();

    for (const missing of this.missingProducts) {
      console.log(`\n🔍 Processing ${missing.productId}...`);
      
      // First, try to find in JSON file
      let scraped: ScrapedProduct | null = null;
      const jsonProduct = this.findProductInJSON(missing.productId);
      
      if (jsonProduct) {
        console.log(`   ✅ Found in JSON file`);
        scraped = this.convertJSONProductToScraped(jsonProduct, missing.chemistry, missing.industry);
      } else {
        // If not in JSON, try scraping from website
        console.log(`   🔍 Not in JSON, scraping from website...`);
        scraped = await this.scrapeProduct(missing.productId);
        
        if (scraped) {
          // Update with chemistry and industry from CSV
          scraped.chemistry = missing.chemistry;
          scraped.industry = missing.industry;
        }
      }
      
      if (!scraped) {
        console.log(`   ❌ Could not find ${missing.productId}`);
        this.results.push({
          productId: missing.productId,
          status: 'not_found'
        });
        continue;
      }

      console.log(`   ✅ Scraped: ${scraped.name}`);
      console.log(`   URL: ${scraped.url}`);
      console.log(`   Benefits: ${scraped.benefits.length}`);
      console.log(`   Applications: ${scraped.applications.length}`);

      if (!this.dryRun) {
        try {
          // Create product via API
          const response = await axios.post(
            `${API_BASE_URL}/products`,
            scraped,
            {
              headers: {
                'Content-Type': 'application/json'
              },
              timeout: 30000
            }
          );

          if (response.data.success) {
            console.log(`   ✅ Created in database`);
            this.results.push({
              productId: missing.productId,
              status: 'scraped_and_created'
            });
          } else {
            throw new Error(response.data.message || 'Create failed');
          }
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
          console.error(`   ❌ Error creating: ${errorMessage}`);
          this.results.push({
            productId: missing.productId,
            status: 'create_failed',
            errorMessage: errorMessage
          });
        }
      } else {
        console.log(`   ⏭️  Would create (dry run)`);
        this.results.push({
          productId: missing.productId,
          status: 'scraped_and_created'
        });
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.printSummary();
  }

  private printSummary(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 SCRAPING SUMMARY');
    console.log('='.repeat(80));

    const created = this.results.filter(r => r.status === 'scraped_and_created');
    const notFound = this.results.filter(r => r.status === 'not_found');
    const failed = this.results.filter(r => r.status === 'create_failed' || r.status === 'scraped_failed');

    console.log(`\n✅ Successfully ${this.dryRun ? 'would scrape and create' : 'scraped and created'}: ${created.length}`);
    console.log(`❌ Not found: ${notFound.length}`);
    console.log(`⚠️  Failed: ${failed.length}`);

    if (notFound.length > 0) {
      console.log('\n📋 Products not found on website:');
      notFound.forEach(r => {
        console.log(`   - ${r.productId}`);
      });
    }

    if (failed.length > 0) {
      console.log('\n⚠️  Errors:');
      failed.forEach(r => {
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

  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`❌ ERROR: CSV file not found at: ${CSV_FILE_PATH}`);
    process.exit(1);
  }

  const scraper = new MissingProductScraper(dryRun);
  await scraper.execute();

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

