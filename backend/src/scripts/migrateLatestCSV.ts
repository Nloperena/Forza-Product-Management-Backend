import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import { Product } from '../models/Product';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const CSV_FILE_PATH = path.join(__dirname, '../../../Prod Attr for Website DB Jan 1 2025(Nico! Use This Tab! ).csv');
const JSON_FILE_PATH = path.join(__dirname, '../../data/forza_products_organized.json');
const SQLITE_DB_PATH = path.join(__dirname, '../../data/products.db');

interface RawCSVRow {
  [key: string]: string;
}

class LatestCSVMigrator {
  private pool: Pool | null = null;
  private sqliteDb: sqlite3.Database | null = null;
  private products: Product[] = [];
  private dryRun: boolean = true;

  constructor(dryRun: boolean = true) {
    this.dryRun = dryRun;
    if (!dryRun) {
      if (process.env.DATABASE_URL) {
        this.pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        });
      } else {
        console.log('ℹ️ DATABASE_URL not found, using local SQLite database.');
        this.sqliteDb = new sqlite3.Database(SQLITE_DB_PATH);
      }
    }
  }

  async migrate() {
    console.log('🚀 Starting Latest CSV Migration...');

    try {
      // 1. Parse CSV
      const rows = this.parseCSV();
      console.log(`📊 Parsed ${rows.length} rows from CSV`);

      // 2. Clean and Normalize Data
      this.products = this.normalizeData(rows);
      console.log(`✅ Normalized ${this.products.length} products`);

      // 3. Update JSON File
      this.updateJSON();
      console.log(`📁 Updated ${JSON_FILE_PATH}`);

      // 4. Update Database
      await this.updateDatabase();
      console.log('🗄️ Database update completed');

      // 5. Update Metadata
      this.updateMetadata();
      console.log('📝 Metadata updated');

    } catch (error) {
      console.error('❌ Migration failed:', error);
    } finally {
      if (this.pool) await this.pool.end();
    }
  }

  private parseCSV(): RawCSVRow[] {
    const content = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const rows: RawCSVRow[] = [];
    let currentLine = '';
    let inQuotes = false;
    const lines: string[] = [];

    // Custom line splitter that respects quotes
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      if (char === '"') inQuotes = !inQuotes;
      if (char === '\n' && !inQuotes) {
        lines.push(currentLine.trim());
        currentLine = '';
      } else {
        currentLine += char;
      }
    }
    if (currentLine) lines.push(currentLine.trim());

    let currentHeaders: string[] = [];

    for (const line of lines) {
      if (!line || line.replace(/,/g, '').trim() === '') continue;

      const parts = this.splitCSVLine(line);
      
      // Detect header row
      if (parts[2]?.toLowerCase() === 'industry' && parts[4]?.toLowerCase() === 'product id') {
        currentHeaders = parts.map(h => h.trim());
        continue;
      }

      if (currentHeaders.length > 0 && parts.length >= 5 && parts[4]) {
        const row: RawCSVRow = {};
        currentHeaders.forEach((header, index) => {
          if (header) {
            row[header] = parts[index] || '';
          }
        });
        rows.push(row);
      }
    }

    return rows;
  }

  private splitCSVLine(line: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(this.cleanValue(current));
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(this.cleanValue(current));
    return parts;
  }

  private cleanValue(val: string): string {
    return val.trim()
      .replace(/^"|"$/g, '') // Remove wrapping quotes
      .replace(/""/g, '"')    // Unescape quotes
      .replace(/[\uFFFD\u00A0]/g, ' '); // Fix common misinterpreted characters
  }

  private normalizeData(rows: RawCSVRow[]): Product[] {
    const products: Product[] = [];

    for (const row of rows) {
      const productId = row['Product ID']?.trim();
      if (!productId || productId === '???' || productId === 'N/A') continue;

      const industry = this.mapIndustry(row['Industry']);
      const family = this.mapFamily(row['Family']);
      
      const benefits = this.parseList(row['Benefits'] || row['Benefits '])
        .filter(b => b.toLowerCase() !== 'already on new site');
      
      const applications = this.parseList(row['Applications'] || row['Applications ']);
      const sizing = this.parseList(row['Size'] || row['Size ']);

      const product: Product = {
        id: productId, 
        product_id: productId,
        name: row['Product Name'] || '',
        full_name: `${productId} ${row['Product Name'] || ''}`.trim(),
        description: (row['Applications'] || '').split('\n')[0].replace(/^|^\*|^-/, '').trim(),
        brand: family,
        industry: industry,
        chemistry: row['Chemistry'] === '???' ? '' : row['Chemistry'],
        benefits: benefits,
        applications: applications,
        sizing: sizing,
        technical: [], 
        published: true,
        benefits_count: benefits.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        url: '', 
        image: `/product-images/${productId}.png` 
      };

      products.push(product);
    }

    return products;
  }

  private mapIndustry(industry: string): string {
    const map: { [key: string]: string } = {
      'Industrial': 'industrial_industry',
      'Insulation': 'insulation_industry',
      'Marine': 'marine_industry',
      'Composites': 'composites_industry',
      'Transportation': 'transportation_industry',
      'Construction': 'construction_industry',
      'Foam': 'foam_industry'
    };
    return map[industry] || industry.toLowerCase().replace(/\s+/g, '_') + '_industry';
  }

  private mapFamily(family: string): string {
    const f = (family || '').toLowerCase();
    if (f.includes('bond')) return 'forza_bond';
    if (f.includes('seal')) return 'forza_seal';
    if (f.includes('tape')) return 'forza_tape';
    if (f.includes('clean')) return 'forza_clean';
    return f.replace(/\s+/g, '_');
  }

  private parseList(val: string): string[] {
    if (!val) return [];
    // Split by newline or common bullet point markers
    return val.split(/\r?\n|[*•\-\u00B7\u2022\u2023\u2043\u204C\u204D\u2219\u25CB\u25CF\u25D8\u25E6]/)
      .map(item => item.trim())
      .filter(item => item.length > 0 && item !== '"' && item !== '•' && item !== '*');
  }

  private updateJSON() {
    if (this.dryRun) {
      console.log('⏭️  Skipping JSON update (dry run)');
      return;
    }
    const currentData = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf-8'));
    const organized: any = {
      metadata: currentData.forza_products_organized.metadata,
    };

    // Pre-populate with existing brand descriptions
    for (const brand of ['forza_bond', 'forza_seal', 'forza_tape', 'forza_clean']) {
      if (currentData.forza_products_organized[brand]) {
        organized[brand] = {
          description: currentData.forza_products_organized[brand].description,
          products: {}
        };
      }
    }

    for (const product of this.products) {
      const brand = product.brand;
      const industry = product.industry;

      if (!organized[brand]) {
        organized[brand] = { description: `${brand.replace('_', ' ')} products`, products: {} };
      }
      if (!organized[brand].products[industry]) {
        organized[brand].products[industry] = {
          description: `${industry.replace('_industry', '').replace('_', ' ')} products`,
          products: []
        };
      }

      // Preserve existing metadata like URL and Image if possible
      const existingProduct = this.findExistingProduct(currentData, product.product_id);
      if (existingProduct) {
        product.url = existingProduct.url || '';
        product.image = existingProduct.image || product.image;
        if (existingProduct.technical && existingProduct.technical.length > 0) {
          product.technical = existingProduct.technical;
        }
      }

      organized[brand].products[industry].products.push(product);
    }

    // Update metadata
    organized.metadata.total_products = this.products.length;
    organized.metadata.organized_date = new Date().toISOString().split('T')[0];
    organized.metadata.notes = `Updated from latest CSV on ${organized.metadata.organized_date}.`;

    fs.writeFileSync(JSON_FILE_PATH, JSON.stringify({ forza_products_organized: organized }, null, 2));
  }

  private findExistingProduct(data: any, productId: string): any | null {
    const organized = data.forza_products_organized;
    for (const brandKey in organized) {
      if (brandKey === 'metadata') continue;
      const brand = organized[brandKey];
      if (brand.products) {
        for (const industryKey in brand.products) {
          const industry = brand.products[industryKey];
          const found = industry.products.find((p: any) => p.product_id === productId);
          if (found) return found;
        }
      }
    }
    return null;
  }

  private async updateDatabase() {
    if (this.dryRun) {
      console.log('⏭️  Skipping Database update (dry run)');
      return;
    }

    if (this.pool) {
      await this.updatePostgres();
    } else if (this.sqliteDb) {
      await this.updateSQLite();
    } else {
      console.log('⚠️ No database connection. Skipping DB update.');
    }
  }

  private async updatePostgres() {
    if (!this.pool) return;
    console.log('📡 Updating PostgreSQL database...');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const product of this.products) {
        const sql = `
          INSERT INTO products (
            product_id, name, full_name, description, brand, industry,
            chemistry, url, image, benefits, applications, technical, sizing,
            published, benefits_count, last_edited, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
          ON CONFLICT (product_id) DO UPDATE SET
            name = EXCLUDED.name,
            full_name = EXCLUDED.full_name,
            description = EXCLUDED.description,
            brand = EXCLUDED.brand,
            industry = EXCLUDED.industry,
            chemistry = EXCLUDED.chemistry,
            benefits = EXCLUDED.benefits,
            applications = EXCLUDED.applications,
            sizing = EXCLUDED.sizing,
            benefits_count = EXCLUDED.benefits_count,
            last_edited = EXCLUDED.last_edited,
            updated_at = EXCLUDED.updated_at
        `;

        const params = [
          product.product_id, product.name, product.full_name, product.description,
          product.brand, product.industry, product.chemistry || '',
          product.url || '', product.image,
          JSON.stringify(product.benefits), JSON.stringify(product.applications),
          JSON.stringify(product.technical), JSON.stringify(product.sizing || []),
          true, product.benefits.length, new Date().toISOString(), new Date().toISOString()
        ];
        await client.query(sql, params);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async updateSQLite() {
    if (!this.sqliteDb) return;
    console.log('📡 Updating SQLite database...');
    
    const db = this.sqliteDb;
    
    return new Promise<void>((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        const sql = `
          INSERT INTO products (
            id, product_id, name, full_name, description, brand, industry,
            chemistry, url, image, benefits, applications, technical, sizing,
            published, benefits_count, last_edited, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (product_id) DO UPDATE SET
            name = excluded.name,
            full_name = excluded.full_name,
            description = excluded.description,
            brand = excluded.brand,
            industry = excluded.industry,
            chemistry = excluded.chemistry,
            benefits = excluded.benefits,
            applications = excluded.applications,
            sizing = excluded.sizing,
            benefits_count = excluded.benefits_count,
            last_edited = excluded.last_edited,
            updated_at = excluded.updated_at
        `;

        for (const product of this.products) {
          db.run(sql, [
            product.product_id, // Using product_id as id for SQLite
            product.product_id,
            product.name,
            product.full_name,
            product.description,
            product.brand,
            product.industry,
            product.chemistry || '',
            product.url || '',
            product.image,
            JSON.stringify(product.benefits),
            JSON.stringify(product.applications),
            JSON.stringify(product.technical),
            JSON.stringify(product.sizing || []),
            1, // true for SQLite
            product.benefits.length,
            new Date().toISOString(),
            new Date().toISOString()
          ], (err) => {
            if (err) {
              console.error(`Error updating ${product.product_id}:`, err);
            }
          });
        }

        db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  private updateMetadata() {
    // Already handled in updateJSON
  }
}

const args = process.argv.slice(2);
const dryRun = !args.includes('--live');

const migrator = new LatestCSVMigrator(dryRun);
migrator.migrate();

