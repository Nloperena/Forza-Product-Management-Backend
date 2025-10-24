import { Pool, PoolClient } from 'pg';

class PostgresDatabaseService {
  private pool: Pool | null = null;

  async connect(): Promise<Pool> {
    if (this.pool) {
      return this.pool;
    }

    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    console.log('Connected to PostgreSQL database');
    return this.pool;
  }

  async getClient(): Promise<PoolClient> {
    const pool = await this.connect();
    return pool.connect();
  }

  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool;
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('PostgreSQL connection closed');
    }
  }

  async initializeDatabase(): Promise<void> {
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
}

export const postgresDatabaseService = new PostgresDatabaseService();









