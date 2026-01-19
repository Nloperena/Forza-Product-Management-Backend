import { Database } from 'sqlite3';
import { Pool, PoolClient } from 'pg';
import path from 'path';

class DatabaseService {
  private db: Database | null = null;
  private pool: Pool | null = null;
  private dbPath: string;
  private usePostgres: boolean;

  constructor() {
    this.dbPath = path.join(__dirname, '../../data/products.db');
    this.usePostgres = !!process.env.DATABASE_URL || !!process.env.POSTGRES_URL;
  }

  async connect(): Promise<Database | Pool> {
    if (this.usePostgres) {
      return this.connectPostgres();
    } else {
      return this.connectSQLite();
    }
  }

  private async connectPostgres(): Promise<Pool> {
    if (this.pool) {
      return this.pool;
    }

    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required for PostgreSQL');
    }

    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' || connectionString.includes('amazonaws.com') || connectionString.includes('heroku') 
        ? { rejectUnauthorized: false } 
        : false,
    });

    console.log('Connected to PostgreSQL database');
    return this.pool;
  }

  private async connectSQLite(): Promise<Database> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      // Ensure the data directory exists
      const fs = require('fs');
      const dataDir = path.dirname(this.dbPath);
      
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database at:', this.dbPath);
          
          // Enable foreign keys
          this.db!.exec('PRAGMA foreign_keys = ON');
          
          // Set journal mode to WAL for better performance
          this.db!.exec('PRAGMA journal_mode = WAL');
          
          resolve(this.db!);
        }
      });
    });
  }

  async getClient(): Promise<PoolClient> {
    if (this.usePostgres) {
      const pool = await this.connectPostgres();
      return pool.connect();
    } else {
      throw new Error('getClient() is only available for PostgreSQL');
    }
  }

  getDatabase(): Database {
    if (!this.usePostgres) {
      if (!this.db) {
        throw new Error('Database not connected. Call connect() first.');
      }
      return this.db;
    } else {
      throw new Error('getDatabase() is only available for SQLite. Use getPool() for PostgreSQL.');
    }
  }

  getPool(): Pool {
    if (this.usePostgres) {
      if (!this.pool) {
        throw new Error('Pool not connected. Call connect() first.');
      }
      return this.pool;
    } else {
      throw new Error('getPool() is only available for PostgreSQL');
    }
  }

  async disconnect(): Promise<void> {
    if (this.usePostgres) {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
        console.log('PostgreSQL connection closed');
      }
    } else {
      if (this.db) {
        return new Promise((resolve, reject) => {
          this.db!.close((err) => {
            if (err) {
              console.error('Error closing database:', err);
              reject(err);
            } else {
              console.log('Database connection closed');
              this.db = null;
              resolve();
            }
          });
        });
      }
    }
  }

  async initializeDatabase(): Promise<void> {
    if (this.usePostgres) {
      await this.initializePostgres();
    } else {
      await this.connect();
      await this.initializeSQLite();
      console.log('SQLite database initialized successfully');
    }
  }

  private async initializeSQLite(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db!.serialize(() => {
        // Products table
        this.db!.run(`
          CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            full_name TEXT,
            description TEXT,
            brand TEXT,
            industry TEXT,
            chemistry TEXT,
            url TEXT,
            image TEXT,
            benefits TEXT,
            applications TEXT,
            technical TEXT,
            sizing TEXT,
            color TEXT,
            cleanup TEXT,
            recommended_equipment TEXT,
            published INTEGER DEFAULT 0,
            benefits_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_edited TEXT
          )
        `, (err) => {
          if (err) {
            console.error('Error creating products table:', err);
          } else {
            console.log('Products table ensured in SQLite');
          }
        });

        // Audit logs table
        this.db!.run(`
          CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            user_name TEXT NOT NULL,
            user_email TEXT,
            changes_summary TEXT NOT NULL,
            before_data TEXT,
            after_data TEXT,
            ip_address TEXT,
            user_agent TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('Error creating audit_logs table:', err);
          } else {
            console.log('Audit logs table ensured in SQLite');
          }
        });

        // Backups table
        this.db!.run(`
          CREATE TABLE IF NOT EXISTS backups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            backup_name TEXT NOT NULL,
            description TEXT,
            created_by TEXT NOT NULL,
            product_count INTEGER NOT NULL,
            file_path TEXT,
            backup_data TEXT,
            status TEXT DEFAULT 'active',
            promoted_at DATETIME,
            promoted_by TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            console.error('Error creating backups table:', err);
            reject(err);
          } else {
            console.log('Backups table ensured in SQLite');
            resolve();
          }
        });
      });
    });
  }

  private async initializePostgres(): Promise<void> {
    const client = await this.getClient();
    
    try {
      // Create products table
      await client.query(`
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          product_id VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          full_name VARCHAR(255),
          description TEXT,
          brand VARCHAR(100),
          industry VARCHAR(100),
          chemistry TEXT,
          url TEXT,
          image TEXT,
          benefits JSONB DEFAULT '[]',
          applications JSONB DEFAULT '[]',
          technical JSONB DEFAULT '[]',
          sizing JSONB DEFAULT '[]',
          color TEXT,
          cleanup TEXT,
          recommended_equipment TEXT,
          published BOOLEAN DEFAULT false,
          benefits_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_edited TEXT
        )
      `);

      // Create audit_logs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          action VARCHAR(50) NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id VARCHAR(255) NOT NULL,
          user_name VARCHAR(255) NOT NULL,
          user_email VARCHAR(255),
          changes_summary TEXT NOT NULL,
          before_data TEXT,
          after_data TEXT,
          ip_address VARCHAR(50),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Audit logs table ensured in PostgreSQL');

      // Create backups table
      await client.query(`
        CREATE TABLE IF NOT EXISTS backups (
          id SERIAL PRIMARY KEY,
          backup_name VARCHAR(255) NOT NULL,
          description TEXT,
          created_by VARCHAR(255) NOT NULL,
          product_count INTEGER NOT NULL,
          file_path VARCHAR(255),
          backup_data TEXT,
          status VARCHAR(50) DEFAULT 'active',
          promoted_at TIMESTAMP,
          promoted_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Backups table ensured in PostgreSQL');

      // Migrate existing last_edited column from TIMESTAMP to TEXT if needed
      try {
        // Check current column type
        const columnInfo = await client.query(`
          SELECT data_type 
          FROM information_schema.columns 
          WHERE table_name = 'products' 
          AND column_name = 'last_edited'
        `);
        
        if (columnInfo.rows.length > 0 && columnInfo.rows[0].data_type === 'timestamp without time zone') {
          // Convert TIMESTAMP to TEXT, preserving existing timestamp values as ISO strings
          await client.query(`
            ALTER TABLE products 
            ALTER COLUMN last_edited TYPE TEXT 
            USING CASE 
              WHEN last_edited IS NULL THEN NULL 
              ELSE last_edited::TEXT 
            END
          `);
          console.log('Migrated last_edited column from TIMESTAMP to TEXT type');
        } else if (columnInfo.rows.length > 0) {
          console.log('last_edited column is already TEXT or different type:', columnInfo.rows[0].data_type);
        }
      } catch (migrationError: any) {
        // Log error but don't fail initialization - column might not exist or migration already done
        console.warn('[Migration] Note (may be expected):', migrationError.message);
      }

      console.log('PostgreSQL database initialized successfully');

      // Ensure new columns exist
      try {
        await client.query(`
          ALTER TABLE products ADD COLUMN IF NOT EXISTS color TEXT,
          ADD COLUMN IF NOT EXISTS cleanup TEXT,
          ADD COLUMN IF NOT EXISTS recommended_equipment TEXT
        `);
      } catch (alterError) {
        console.warn('Error adding new columns (may already exist):', alterError);
      }
    } finally {
      client.release();
    }
  }

  isPostgres(): boolean {
    return this.usePostgres;
  }
}

export const databaseService = new DatabaseService();
