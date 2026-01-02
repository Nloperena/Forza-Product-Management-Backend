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

class OptimizedMigrator {
  private pool: Pool | null = null;
  private sqliteDb: sqlite3.Database | null = null;
  private products: Product[] = [];
  private live: boolean = false;

  constructor(live: boolean = false) {
    this.live = live;
    if (live) {
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
    console.log('🚀 Starting Optimized Migration V2...');
    console.log(`Mode: ${this.live ? 'LIVE (Updating JSON and DB)' : 'DRY RUN (No changes)'}`);

    try {
      // 1. Parse CSV
      const rows = this.parseCSV();
      console.log(`📊 Parsed ${rows.length} rows from CSV`);

      // 2. Load current JSON to preserve technical data, images, etc.
      const currentJsonData = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf-8'));

      // 3. Clean and Normalize Data
      this.products = this.normalizeData(rows, currentJsonData);
      console.log(`✅ Normalized ${this.products.length} products`);

      if (this.live) {
        // 4. Update JSON File
        this.updateJSON(currentJsonData);
        console.log(`📁 Updated ${JSON_FILE_PATH}`);

        // 5. Update Database
        await this.updateDatabase();
        console.log('🗄️ Database update completed');
      } else {
        console.log('⏭️ Skipping file updates (Dry Run)');
        // Show a sample product
        if (this.products.length > 0) {
          console.log('\nSample Optimized Product:');
          console.log(JSON.stringify(this.products[0], null, 2));
        }
      }

    } catch (error) {
      console.error('❌ Migration failed:', error);
    } finally {
      if (this.pool) await this.pool.end();
      if (this.sqliteDb) this.sqliteDb.close();
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
      .replace(/[\uFFFD\u00A0\u00B7]/g, ' '); // Fix common misinterpreted characters
  }

  private normalizeData(rows: RawCSVRow[], currentJson: any): Product[] {
    const products: Product[] = [];
    const seenIds = new Set<string>();

    for (const row of rows) {
      const productId = row['Product ID']?.trim();
      if (!productId || productId === '???' || productId === 'N/A' || seenIds.has(productId)) continue;
      seenIds.add(productId);

      const industry = this.mapIndustry(row['Industry']);
      const brand = this.mapBrand(row['Family']);
      
      const benefits = this.parseList(row['Benefits'] || row['Benefits '])
        .filter(b => b.toLowerCase() !== 'already on new site');
      
      const applications = this.parseList(row['Applications'] || row['Applications ']);
      const sizing = this.parseList(row['Size'] || row['Size ']);

      const formattedName = this.cleanProductName(row['Product Name'] || '', productId);
      
      // Preserve existing data from JSON
      const existing = this.findExistingProduct(currentJson, productId);

      const product: Product = {
        product_id: productId,
        name: formattedName,
        description: existing?.description || (row['Applications'] || '').split('\n')[0].replace(/^|^\*|^-/, '').trim(),
        brand: brand,
        industry: industry,
        chemistry: row['Chemistry'] === '???' ? (existing?.chemistry || '') : row['Chemistry'],
        url: existing?.url || '',
        image: existing?.image || `/product-images/${productId}.png`,
        benefits: benefits.length > 0 ? benefits : (existing?.benefits || []),
        applications: applications.length > 0 ? applications : (existing?.applications || []),
        technical: existing?.technical || [],
        sizing: sizing.length > 0 ? sizing : (existing?.sizing || []),
        color: row['Color'] || existing?.color || '',
        cleanup: row['Cleanup'] || existing?.cleanup || '',
        recommended_equipment: row['Recommended Equipment'] || existing?.recommended_equipment || '',
        published: existing ? existing.published : true,
        last_edited: existing?.last_edited || new Date().toISOString()
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

  private mapBrand(family: string): string {
    const f = (family || '').toLowerCase();
    if (f.includes('bond')) return 'forza_bond';
    if (f.includes('seal')) return 'forza_seal';
    if (f.includes('tape')) return 'forza_tape';
    if (f.includes('clean')) return 'forza_clean';
    return f.replace(/\s+/g, '_');
  }

  private parseList(val: string): string[] {
    if (!val) return [];
    return val.split(/\r?\n|[*•\-\u00B7\u2022\u2023\u2043\u204C\u204D\u2219\u25CB\u25CF\u25D8\u25E6]/)
      .map(item => item.trim())
      .filter(item => item.length > 0 && item !== '"' && item !== '•' && item !== '*');
  }

  private cleanProductName(productName: string, productId: string): string {
    if (!productName) return productId;
    let cleaned = productName.trim();
    cleaned = cleaned.replace(/^Forza(BOND|TAPE|SEAL|CLEAN)®?\s*/i, '');
    cleaned = cleaned.replace(new RegExp(`^${productId}\\s*[-–—]?\\s*`, 'i'), '');
    cleaned = cleaned.trim();
    if (cleaned && cleaned !== productId) {
      return `${productId} - ${cleaned}`;
    }
    return productId;
  }

  private updateJSON(currentData: any) {
    const organized: any = {
      metadata: {
        ...currentData.forza_products_organized.metadata,
        total_products: this.products.length,
        organized_date: new Date().toISOString().split('T')[0],
        notes: "Optimized Structure V2"
      }
    };

    // Use specific brand order
    const brands = ['forza_bond', 'forza_seal', 'forza_tape', 'forza_clean'];
    for (const brand of brands) {
      organized[brand] = {
        description: currentData.forza_products_organized[brand]?.description || `${brand.replace('_', ' ')} products`,
        products: {}
      };
    }

    for (const product of this.products) {
      const { brand, industry } = product;
      if (!organized[brand]) {
        organized[brand] = { description: `${brand.replace('_', ' ')} products`, products: {} };
      }
      if (!organized[brand].products[industry]) {
        organized[brand].products[industry] = {
          description: `${industry.replace('_industry', '').replace('_', ' ')} products`,
          products: []
        };
      }
      organized[brand].products[industry].products.push(product);
    }

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
    if (this.pool) {
      await this.updatePostgres();
    } else if (this.sqliteDb) {
      await this.updateSQLite();
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
            product_id, name, description, brand, industry,
            chemistry, url, image, benefits, applications, technical, sizing,
            color, cleanup, recommended_equipment, published, last_edited, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          ON CONFLICT (product_id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            brand = EXCLUDED.brand,
            industry = EXCLUDED.industry,
            chemistry = EXCLUDED.chemistry,
            url = EXCLUDED.url,
            image = EXCLUDED.image,
            benefits = EXCLUDED.benefits,
            applications = EXCLUDED.applications,
            technical = EXCLUDED.technical,
            sizing = EXCLUDED.sizing,
            color = EXCLUDED.color,
            cleanup = EXCLUDED.cleanup,
            recommended_equipment = EXCLUDED.recommended_equipment,
            published = EXCLUDED.published,
            last_edited = EXCLUDED.last_edited,
            updated_at = EXCLUDED.updated_at
        `;

        const params = [
          product.product_id, product.name, product.description,
          product.brand, product.industry, product.chemistry || '',
          product.url || '', product.image,
          JSON.stringify(product.benefits), JSON.stringify(product.applications),
          JSON.stringify(product.technical), JSON.stringify(product.sizing),
          product.color || '', product.cleanup || '', product.recommended_equipment || '',
          product.published, product.last_edited, new Date().toISOString()
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

    // Drop and recreate table for clean schema update
    await new Promise<void>((resolve, reject) => {
      db.serialize(() => {
        db.run('DROP TABLE IF EXISTS products');
        db.run(`
          CREATE TABLE products (
            product_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            brand TEXT NOT NULL,
            industry TEXT NOT NULL,
            chemistry TEXT,
            url TEXT,
            image TEXT,
            benefits TEXT NOT NULL,
            applications TEXT NOT NULL,
            technical TEXT NOT NULL,
            sizing TEXT NOT NULL,
            color TEXT,
            cleanup TEXT,
            recommended_equipment TEXT,
            published BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_edited TEXT
          )
        `);
        resolve();
      });
    });

    return new Promise<void>((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const sql = `
          INSERT INTO products (
            product_id, name, description, brand, industry,
            chemistry, url, image, benefits, applications, technical, sizing,
            color, cleanup, recommended_equipment, published, last_edited, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        for (const product of this.products) {
          db.run(sql, [
            product.product_id, product.name, product.description,
            product.brand, product.industry, product.chemistry || '',
            product.url || '', product.image,
            JSON.stringify(product.benefits), JSON.stringify(product.applications),
            JSON.stringify(product.technical), JSON.stringify(product.sizing),
            product.color || '', product.cleanup || '', product.recommended_equipment || '',
            product.published ? 1 : 0, product.last_edited, new Date().toISOString()
          ]);
        }
        db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }
}

const args = process.argv.slice(2);
const live = args.includes('--live');
const migrator = new OptimizedMigrator(live);
migrator.migrate();

