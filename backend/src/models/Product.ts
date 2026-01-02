import { Database } from 'sqlite3';
import { Pool, PoolClient } from 'pg';
import { databaseService } from '../services/database';

export interface TechnicalProperty {
  property: string;
  value: string;
  unit?: string;
}

export interface Product {
  id: string; // Required for compatibility with existing scripts
  product_id: string; // Used as the primary identifier
  name: string;
  full_name: string; // Required for compatibility
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
  benefits_count: number; // Required for compatibility
  created_at?: string;
  updated_at?: string;
  last_edited?: string;
}

export interface ProductStats {
  total_products: number;
  total_benefits: number;
  organized_date: string;
  hierarchy: string;
  notes: string;
}

export interface BrandIndustryCounts {
  [brand: string]: {
    [industry: string]: number;
  };
}

export class ProductModel {
  private db: Database | null = null;
  private pool: Pool | null = null;
  private isPostgres: boolean;

  constructor(database?: Database) {
    this.isPostgres = databaseService.isPostgres();
    if (database) {
      this.db = database;
    } else if (this.isPostgres) {
      this.pool = databaseService.getPool();
    }
    this.createTable();
  }

  private createTable(): void {
    if (this.isPostgres) {
      // PostgreSQL table creation is handled by databaseService.initializeDatabase()
      console.log('PostgreSQL table creation handled by database service');
      return;
    }

    const sql = `
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        full_name TEXT,
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
        benefits_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_edited TEXT
      )
    `;

    if (this.db) {
      this.db.run(sql, (err) => {
        if (err) {
          console.error('Error creating products table:', err);
        } else {
          console.log('Products table created successfully');
        }
      });
    }
  }

  async getAllProducts(published?: string): Promise<Product[]> {
    let sql = 'SELECT * FROM products';
    const params: any[] = [];
    
    // Add published filter if specified
    if (published !== undefined) {
      const publishedValue = published === 'true';
      sql += ' WHERE published = $1';
      params.push(publishedValue);
    }
    
    sql += ' ORDER BY created_at DESC';

    if (this.isPostgres) {
      const client = await databaseService.getClient();
      try {
        const result = await client.query(sql, params);
        return result.rows.map(row => this.parseProduct(row));
      } finally {
        client.release();
      }
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      
      // Convert PostgreSQL params to SQLite format
      const sqliteParams = params.map((_, index) => '?');
      const sqliteSql = sql.replace(/\$\d+/g, () => sqliteParams.shift() || '?');
      
      this.db!.all(sqliteSql, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const products = rows.map(row => this.parseProduct(row));
          resolve(products);
        }
      });
    });
  }

  async getProductById(id: string): Promise<Product | null> {
    if (this.isPostgres) {
      const client = await databaseService.getClient();
      try {
        const query = 'SELECT * FROM products WHERE product_id = $1';
        const params = [id];
        
        const result = await client.query(query, params);
        if (result.rows.length > 0) {
          return this.parseProduct(result.rows[0]);
        }
        return null;
      } finally {
        client.release();
      }
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not connected'));
        return;
      }
      
      const sql = 'SELECT * FROM products WHERE product_id = ?';
      
      this.db!.get(sql, [id], (err, row: any) => {
        if (err) {
          reject(err);
        } else if (row) {
          resolve(this.parseProduct(row));
        } else {
          resolve(null);
        }
      });
    });
  }

  async createProduct(product: Omit<Product, 'created_at' | 'updated_at'>): Promise<Product> {
    if (this.isPostgres) {
      const client = await databaseService.getClient();
      try {
        const sql = `
          INSERT INTO products (
            product_id, name, full_name, description, brand, industry,
            chemistry, url, image, benefits, applications, technical, sizing,
            color, cleanup, recommended_equipment, published, benefits_count, last_edited
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          RETURNING *
        `;
        
        const params = [
          product.product_id, product.name, product.full_name || product.name, product.description,
          product.brand, product.industry, product.chemistry, product.url, product.image,
          JSON.stringify(product.benefits), JSON.stringify(product.applications),
          JSON.stringify(product.technical), JSON.stringify(product.sizing),
          product.color, product.cleanup, product.recommended_equipment,
          product.published, product.benefits_count || 0, product.last_edited
        ];

        const result = await client.query(sql, params);
        return this.parseProduct(result.rows[0]);
      } finally {
        client.release();
      }
    }

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO products (
          product_id, name, full_name, description, brand, industry,
          chemistry, url, image, benefits, applications, technical, sizing,
          color, cleanup, recommended_equipment, published, benefits_count, last_edited
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        product.product_id, product.name, product.full_name || product.name, product.description,
        product.brand, product.industry, product.chemistry, product.url, product.image,
        JSON.stringify(product.benefits), JSON.stringify(product.applications),
        JSON.stringify(product.technical), JSON.stringify(product.sizing),
        product.color, product.cleanup, product.recommended_equipment,
        product.published ? 1 : 0, product.benefits_count || 0, product.last_edited
      ];

      this.db!.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          const newProduct: Product = {
            ...product,
            id: product.product_id, // Fallback for return object
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          resolve(newProduct);
        }
      });
    });
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    if (this.isPostgres) {
      const client = await databaseService.getClient();
      try {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        if (updates.name !== undefined) { fields.push(`name = $${paramIndex++}`); values.push(updates.name); }
        if (updates.full_name !== undefined) { fields.push(`full_name = $${paramIndex++}`); values.push(updates.full_name); }
        if (updates.description !== undefined) { fields.push(`description = $${paramIndex++}`); values.push(updates.description); }
        if (updates.brand !== undefined) { fields.push(`brand = $${paramIndex++}`); values.push(updates.brand); }
        if (updates.industry !== undefined) { fields.push(`industry = $${paramIndex++}`); values.push(updates.industry); }
        if (updates.chemistry !== undefined) { fields.push(`chemistry = $${paramIndex++}`); values.push(updates.chemistry); }
        if (updates.url !== undefined) { fields.push(`url = $${paramIndex++}`); values.push(updates.url); }
        if (updates.image !== undefined) { fields.push(`image = $${paramIndex++}`); values.push(updates.image); }
        if (updates.benefits !== undefined) { 
          fields.push(`benefits = $${paramIndex++}`); 
          values.push(JSON.stringify(updates.benefits));
          fields.push(`benefits_count = $${paramIndex++}`);
          values.push(updates.benefits.length);
        }
        if (updates.applications !== undefined) { fields.push(`applications = $${paramIndex++}`); values.push(JSON.stringify(updates.applications)); }
        if (updates.technical !== undefined) { fields.push(`technical = $${paramIndex++}`); values.push(JSON.stringify(updates.technical)); }
        if (updates.sizing !== undefined) { fields.push(`sizing = $${paramIndex++}`); values.push(JSON.stringify(updates.sizing)); }
        if (updates.color !== undefined) { fields.push(`color = $${paramIndex++}`); values.push(updates.color); }
        if (updates.cleanup !== undefined) { fields.push(`cleanup = $${paramIndex++}`); values.push(updates.cleanup); }
        if (updates.recommended_equipment !== undefined) { fields.push(`recommended_equipment = $${paramIndex++}`); values.push(updates.recommended_equipment); }
        if (updates.published !== undefined) { fields.push(`published = $${paramIndex++}`); values.push(Boolean(updates.published)); }
        if (updates.last_edited !== undefined) { fields.push(`last_edited = $${paramIndex++}`); values.push(updates.last_edited); }

        if (fields.length === 0) {
          throw new Error('No fields to update');
        }

        fields.push(`updated_at = $${paramIndex++}`);
        values.push(new Date().toISOString());
        
        // Match by product_id
        const idParam = paramIndex++;
        values.push(id);
        const sql = `UPDATE products SET ${fields.join(', ')} WHERE product_id = $${idParam} RETURNING *`;

        const result = await client.query(sql, values);
        if (result.rows.length > 0) {
          return this.parseProduct(result.rows[0]);
        }
        return null;
      } finally {
        client.release();
      }
    }

    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];

      if (updates.name) { fields.push('name = ?'); values.push(updates.name); }
      if (updates.full_name) { fields.push('full_name = ?'); values.push(updates.full_name); }
      if (updates.description) { fields.push('description = ?'); values.push(updates.description); }
      if (updates.brand) { fields.push('brand = ?'); values.push(updates.brand); }
      if (updates.industry) { fields.push('industry = ?'); values.push(updates.industry); }
      if (updates.chemistry) { fields.push('chemistry = ?'); values.push(updates.chemistry); }
      if (updates.url) { fields.push('url = ?'); values.push(updates.url); }
      if (updates.image) { fields.push('image = ?'); values.push(updates.image); }
      if (updates.benefits) { 
        fields.push('benefits = ?'); 
        values.push(JSON.stringify(updates.benefits));
        fields.push('benefits_count = ?');
        values.push(updates.benefits.length);
      }
      if (updates.applications) { fields.push('applications = ?'); values.push(JSON.stringify(updates.applications)); }
      if (updates.technical) { fields.push('technical = ?'); values.push(JSON.stringify(updates.technical)); }
      if (updates.sizing) { fields.push('sizing = ?'); values.push(JSON.stringify(updates.sizing)); }
      if (updates.color) { fields.push('color = ?'); values.push(updates.color); }
      if (updates.cleanup) { fields.push('cleanup = ?'); values.push(updates.cleanup); }
      if (updates.recommended_equipment) { fields.push('recommended_equipment = ?'); values.push(updates.recommended_equipment); }
      if (updates.published !== undefined) { fields.push('published = ?'); values.push(updates.published ? 1 : 0); }
      if (updates.last_edited) { fields.push('last_edited = ?'); values.push(updates.last_edited); }

      if (fields.length === 0) {
        reject(new Error('No fields to update'));
        return;
      }

      fields.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(id);

      const sql = `UPDATE products SET ${fields.join(', ')} WHERE product_id = ?`;

      this.db!.run(sql, values, (err: any) => {
        if (err) {
          reject(err);
        } else {
          this.db!.get('SELECT changes() as changes', [], (err2: any, row: any) => {
            if (err2) {
              reject(err2);
            } else if (row.changes === 0) {
              resolve(null);
            } else {
              this.getProductById(id).then(resolve).catch(reject);
            }
          });
        }
      });
    });
  }

  async deleteProduct(id: string): Promise<boolean> {
    if (this.isPostgres) {
      const client = await databaseService.getClient();
      try {
        const sql = 'DELETE FROM products WHERE product_id = $1';
        const result = await client.query(sql, [id]);
        return (result.rowCount || 0) > 0;
      } finally {
        client.release();
      }
    }

    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM products WHERE product_id = ?';
      
      this.db!.run(sql, [id], (err: any) => {
        if (err) {
          reject(err);
        } else {
          this.db!.get('SELECT changes() as changes', [], (err2: any, row: any) => {
            if (err2) {
              reject(err2);
            } else {
              resolve(row.changes > 0);
            }
          });
        }
      });
    });
  }

  async getStatistics(): Promise<ProductStats> {
    if (this.isPostgres) {
      const client = await databaseService.getClient();
      try {
        const sql = 'SELECT COUNT(*) as total_products FROM products';
        
        const result = await client.query(sql);
        const row = result.rows[0];
        
        const stats: ProductStats = {
          total_products: parseInt(row.total_products) || 0,
          total_benefits: 0,
          organized_date: new Date().toISOString().split('T')[0] || new Date().toISOString(),
          hierarchy: "Brand → Industry → Products",
          notes: "Optimized Database"
        };
        return stats;
      } finally {
        client.release();
      }
    }

    return new Promise((resolve, reject) => {
      const sql = 'SELECT COUNT(*) as total_products FROM products';
      
      this.db!.get(sql, [], (err, row: any) => {
        if (err) {
          reject(err);
        } else {
          const stats: ProductStats = {
            total_products: row.total_products || 0,
            total_benefits: 0,
            organized_date: new Date().toISOString().split('T')[0] || new Date().toISOString(),
            hierarchy: "Brand → Industry → Products",
            notes: "Optimized Database"
          };
          resolve(stats);
        }
      });
    });
  }

  async getBrandIndustryCounts(): Promise<BrandIndustryCounts> {
    if (this.isPostgres) {
      const client = await databaseService.getClient();
      try {
        const sql = 'SELECT brand, industry, COUNT(*) as count FROM products GROUP BY brand, industry';
        const result = await client.query(sql);
        
        const counts: BrandIndustryCounts = {};
        
        result.rows.forEach(row => {
          if (!counts[row.brand]) {
            counts[row.brand] = {};
          }
          counts[row.brand][row.industry] = parseInt(row.count);
        });
        
        return counts;
      } finally {
        client.release();
      }
    }

    return new Promise((resolve, reject) => {
      const sql = 'SELECT brand, industry, COUNT(*) as count FROM products GROUP BY brand, industry';
      
      this.db!.all(sql, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const counts: BrandIndustryCounts = {};
          
          rows.forEach(row => {
            if (!counts[row.brand]) {
              counts[row.brand] = {};
            }
            counts[row.brand][row.industry] = row.count;
          });
          
          resolve(counts);
        }
      });
    });
  }

  private parseProduct(row: any): Product {
    try {
      const productId = row.product_id;
      return {
        id: row.id?.toString() || productId,
        product_id: productId,
        name: row.name,
        full_name: row.full_name || row.name,
        description: row.description || '',
        brand: row.brand,
        industry: row.industry,
        chemistry: row.chemistry,
        url: row.url,
        image: row.image,
        benefits: this.parseJsonField(row.benefits, 'benefits'),
        applications: this.parseJsonField(row.applications, 'applications'),
        technical: this.parseJsonField(row.technical, 'technical'),
        sizing: this.parseJsonField(row.sizing, 'sizing'),
        color: row.color,
        cleanup: row.cleanup,
        recommended_equipment: row.recommended_equipment,
        published: Boolean(row.published),
        benefits_count: row.benefits_count || 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
        last_edited: row.last_edited
      };
    } catch (error) {
      console.error('Error parsing product:', error);
      throw error;
    }
  }

  private parseJsonField(field: any, fieldName: string): any {
    try {
      if (!field) return [];
      if (typeof field === 'string') {
        return JSON.parse(field);
      }
      return field;
    } catch (error) {
      console.error(`Error parsing ${fieldName} field:`, field);
      console.error('Error:', error);
      throw new Error(`Invalid JSON in ${fieldName} field: ${field}`);
    }
  }
}
