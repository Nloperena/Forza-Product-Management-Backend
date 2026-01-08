import fs from 'fs';
import path from 'path';

// Define the Product interface locally to avoid import issues
interface TechnicalProperty {
  property: string;
  value: string;
  unit?: string;
}

interface Product {
  id: string;
  product_id: string;
  name: string;
  full_name: string;
  description: string;
  brand: string;
  industry: string;
  chemistry?: string;
  url?: string;
  image?: string;
  benefits: string[];
  applications: string[];
  technical: TechnicalProperty[];
  sizing: string[];
  color?: string;
  cleanup?: string;
  recommended_equipment?: string;
  published: boolean;
  benefits_count: number;
  last_edited?: string;
}

const CSV_FILE_PATH = 'c:\\Users\\NicoL\\Downloads\\Untitled spreadsheet - Prod Attr for Website DB Jan 1 2025(Randy Review Jan 4) (1).csv';
const JSON_FILE_PATH = path.join(process.cwd(), 'backend/backend/data/forza_products_organized.json');

class RandyCSVMigrator {
  private productsData: any = null;
  private dryRun: boolean = true;
  private stats = {
    totalRows: 0,
    matchedProducts: 0,
    updatedProducts: 0,
    skippedAddNow: 0,
    skippedPhase: 0,
    skippedEmptyId: 0
  };

  constructor(dryRun: boolean = true) {
    this.dryRun = dryRun;
  }

  async migrate() {
    console.log(`🚀 Starting Randy CSV Migration (${this.dryRun ? 'DRY RUN' : 'LIVE RUN'})...`);

    if (!fs.existsSync(CSV_FILE_PATH)) {
      console.error(`❌ CSV file not found at: ${CSV_FILE_PATH}`);
      return;
    }

    if (!fs.existsSync(JSON_FILE_PATH)) {
      console.error(`❌ JSON file not found at: ${JSON_FILE_PATH}`);
      return;
    }

    // 1. Load existing JSON
    const jsonContent = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
    this.productsData = JSON.parse(jsonContent);

    // 2. Parse CSV
    const rows = this.parseCSV();
    this.stats.totalRows = rows.length;
    console.log(`📊 Parsed ${rows.length} rows from CSV`);

    // 3. Process each row
    for (const row of rows) {
      this.processRow(row);
    }

    // 4. Save if not dry run
    if (!this.dryRun) {
      this.updateMetadata();
      fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(this.productsData, null, 2));
      console.log(`✅ Successfully updated ${JSON_FILE_PATH}`);
    }

    console.log('\n📈 Migration Summary:');
    console.log(`- Total CSV Rows: ${this.stats.totalRows}`);
    console.log(`- Matched Products: ${this.stats.matchedProducts}`);
    console.log(`- Updated Products: ${this.stats.updatedProducts}`);
    console.log(`- Skipped (Empty ID): ${this.stats.skippedEmptyId}`);
    console.log(`- Skipped (ADD now): ${this.stats.skippedAddNow}`);
    console.log(`- Skipped (Phase 2/3): ${this.stats.skippedPhase}`);
  }

  private parseCSV(): any[] {
    const content = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const rows: any[] = [];
    let inQuotes = false;
    let currentCell = '';
    let currentRow: string[] = [];

    // Simple robust CSV parser for multi-line cells
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const nextChar = content[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++;
        currentRow.push(currentCell.trim());
        if (currentRow.length > 1) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    // Handle last row if no trailing newline
    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.length > 1) rows.push(currentRow);
    }

    if (rows.length === 0) return [];

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Skip rows that are header markers like "PHASE 2", "PHASE 3", "IGNORE THESE"
    // Also skip empty rows
    return dataRows.filter(row => {
      const firstCell = row[0] || '';
      if (row.length < 5) return false; // Too short to be a product row
      if (firstCell.startsWith('PHASE') || firstCell === 'IGNORE THESE' || firstCell === '#') return false;
      return true;
    }).map(row => {
      const obj: any = {};
      headers.forEach((header: string, i: number) => {
        if (header) obj[header] = row[i] || '';
      });
      return obj;
    });
  }

  private processRow(row: any) {
    const productId = row['Product ID']?.trim();
    if (!productId || productId === '???' || productId === 'Product ID') {
      this.stats.skippedEmptyId++;
      return;
    }

    const onNewSite = row['On New Site Now']?.trim() || '';
    
    // Filtering Logic
    if (onNewSite.includes('ADD now')) {
      this.stats.skippedAddNow++;
      return;
    }
    if (onNewSite.includes('Phase')) {
      this.stats.skippedPhase++;
      return;
    }

    const validStatus = ['Y', 'Done', 'Product Card Issue', 'OK'];
    const isValid = validStatus.some(status => onNewSite.toLowerCase().includes(status.toLowerCase()));

    if (!isValid) {
      // If it's not explicitly in our allowed list, skip it (unless it's an update to existing)
      // Actually the plan says ONLY changing these based on On New Site Now
      return;
    }

    this.stats.matchedProducts++;

    // Find product in JSON
    const product = this.findProductInJson(productId);
    if (!product) {
      if (this.dryRun) {
        console.log(`🔍 Product ${productId} not found in JSON - would skip or create`);
      }
      return;
    }

    this.stats.updatedProducts++;
    this.updateProduct(product, row);
  }

  private findProductInJson(productId: string): any | null {
    const root = this.productsData.forza_products_organized;
    for (const brandKey in root) {
      if (brandKey === 'metadata') continue;
      const brand = root[brandKey];
      if (brand.products) {
        for (const industryKey in brand.products) {
          const industry = brand.products[industryKey];
          if (Array.isArray(industry.products)) {
            const found = industry.products.find((p: any) => p.product_id === productId);
            if (found) return found;
          }
        }
      }
    }
    return null;
  }

  private updateProduct(product: any, row: any) {
    const changes: string[] = [];

    // 1. Family -> Brand
    const family = row['Family']?.trim();
    if (family) {
      const mappedBrand = this.mapFamily(family);
      if (product.brand !== mappedBrand) {
        changes.push(`brand: ${product.brand} -> ${mappedBrand}`);
        if (!this.dryRun) product.brand = mappedBrand;
      }
    }

    // 2. Product Name -> name, full_name
    const rawName = row['Product Name']?.trim();
    if (rawName) {
      const cleanName = this.cleanProductName(rawName, product.product_id);
      const formattedName = `${product.product_id} - ${cleanName}`;
      if (product.name !== formattedName) {
        changes.push(`name: ${product.name} -> ${formattedName}`);
        if (!this.dryRun) {
          product.name = formattedName;
          product.full_name = formattedName;
        }
      }
    }

    // 3. Chemistry
    const chemistry = row['Chemistry']?.trim();
    if (chemistry && chemistry !== '???' && product.chemistry !== chemistry) {
      changes.push(`chemistry: ${product.chemistry} -> ${chemistry}`);
      if (!this.dryRun) product.chemistry = chemistry;
    }

    // 4. Applications
    const rawApps = row['Applications']?.trim();
    if (rawApps) {
      const parsedApps = this.parseApplications(rawApps);
      if (JSON.stringify(product.applications) !== JSON.stringify(parsedApps)) {
        changes.push(`applications: updated`);
        if (!this.dryRun) {
          product.applications = parsedApps;
          // Also update description with the first sentence if it's currently generic or empty
          if (!product.description || product.description.length < 10) {
            product.description = parsedApps[0] || '';
          }
        }
      }
    }

    // 5. Benefits
    const rawBenefits = row['Benefits']?.trim();
    if (rawBenefits && !rawBenefits.toLowerCase().includes('already on new site')) {
      const parsedBenefits = this.parseList(rawBenefits);
      if (JSON.stringify(product.benefits) !== JSON.stringify(parsedBenefits)) {
        changes.push(`benefits: updated`);
        if (!this.dryRun) {
          product.benefits = parsedBenefits;
          product.benefits_count = parsedBenefits.length;
        }
      }
    }

    // 6. Size
    const rawSize = row['Size']?.trim();
    if (rawSize) {
      const parsedSize = this.parseList(rawSize);
      if (JSON.stringify(product.sizing) !== JSON.stringify(parsedSize)) {
        changes.push(`sizing: updated`);
        if (!this.dryRun) product.sizing = parsedSize;
      }
    }

    if (changes.length > 0 && this.dryRun) {
      console.log(`✨ Product ${product.product_id} changes:`);
      changes.forEach(c => console.log(`   - ${c}`));
    }
  }

  private mapFamily(family: string): string {
    const f = family.toLowerCase();
    if (f.includes('bond')) return 'forza_bond';
    if (f.includes('seal')) return 'forza_seal';
    if (f.includes('tape')) return 'forza_tape';
    if (f.includes('clean')) return 'forza_clean';
    return f.replace(/\s+/g, '_');
  }

  private cleanProductName(name: string, id: string): string {
    let clean = name.replace(/ForzaBOND®|ForzaTAPE®|ForzaSEAL®|ForzaCLEAN®|ForzaBOND|ForzaTAPE|ForzaSEAL|ForzaCLEAN/gi, '').trim();
    // Remove ID if present at start
    const idEscaped = id.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    clean = clean.replace(new RegExp(`^${idEscaped}\\s*-?\\s*`, 'i'), '').trim();
    return clean;
  }

  private parseApplications(val: string): string[] {
    // Splits by newline or bullets, preserving the first sentence/paragraph
    const items = val.split(/\r?\n|[*•\-\u00B7\u2022\u2023\u2043\u204C\u204D\u2219\u25CB\u25CF\u25D8\u25E6]/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
    return items;
  }

  private parseList(val: string): string[] {
    if (!val) return [];
    return val.split(/\r?\n|[*•\-\u00B7\u2022\u2023\u2043\u204C\u204D\u2219\u25CB\u25CF\u25D8\u25E6]/)
      .map(item => item.trim())
      .filter(item => item.length > 0 && item !== '"' && item !== '•' && item !== '*');
  }

  private updateMetadata() {
    const metadata = this.productsData.forza_products_organized.metadata;
    metadata.organized_date = new Date().toISOString().split('T')[0];
    metadata.notes = `Updated from Randy's CSV on ${metadata.organized_date}.`;
    
    // Recalculate totals
    let totalProducts = 0;
    let totalBenefits = 0;
    const root = this.productsData.forza_products_organized;
    for (const brandKey in root) {
      if (brandKey === 'metadata') continue;
      const brand = root[brandKey];
      if (brand.products) {
        for (const industryKey in brand.products) {
          const industry = brand.products[industryKey];
          if (Array.isArray(industry.products)) {
            totalProducts += industry.products.length;
            industry.products.forEach((p: any) => {
              totalBenefits += (p.benefits?.length || 0);
            });
          }
        }
      }
    }
    metadata.total_products = totalProducts;
    metadata.total_benefits = totalBenefits;
  }
}

const args = process.argv.slice(2);
const isLive = args.includes('--live');
const migrator = new RandyCSVMigrator(!isLive);
migrator.migrate();

