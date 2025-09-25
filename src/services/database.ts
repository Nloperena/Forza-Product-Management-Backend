import { Database } from 'sqlite3';
import path from 'path';

class DatabaseService {
  private db: Database | null = null;
  private dbPath: string;

  constructor() {
    this.dbPath = path.join(__dirname, '../../data/products.db');
  }

  async connect(): Promise<Database> {
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

  getDatabase(): Database {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  async disconnect(): Promise<void> {
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

  async initializeDatabase(): Promise<void> {
    await this.connect();
    console.log('Database initialized successfully');
  }
}

export const databaseService = new DatabaseService();
