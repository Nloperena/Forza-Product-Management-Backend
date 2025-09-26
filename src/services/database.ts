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
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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
      console.log('SQLite database initialized successfully');
    }
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
          published BOOLEAN DEFAULT false,
          benefits_count INTEGER DEFAULT 0,
          last_edited TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('PostgreSQL database initialized successfully');
    } finally {
      client.release();
    }
  }

  isPostgres(): boolean {
    return this.usePostgres;
  }
}

export const databaseService = new DatabaseService();
