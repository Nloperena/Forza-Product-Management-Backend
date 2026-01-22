import { databaseService } from '../services/database';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Migration Script
 * 
 * This script runs all .sql migration files in the migrations directory.
 * It tracks which migrations have been run in a 'schema_migrations' table.
 */
async function runMigrations() {
  console.log('🚀 Starting database migrations...');

  try {
    await databaseService.connect();
    
    if (!databaseService.isPostgres()) {
      console.log('⚠️ Skipping SQL migrations for SQLite (SQLite uses internal auto-init).');
      process.exit(0);
    }

    const client = await databaseService.getClient();
    
    try {
      // 1. Ensure schema_migrations table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          migration_name VARCHAR(255) UNIQUE NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 2. Get list of migration files
      const migrationsDir = path.join(__dirname, '../../migrations');
      const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql') && f !== 'run_all_migrations.sql')
        .sort(); // Ensure they run in order (001, 002, etc.)

      console.log(`🔍 Found ${files.length} migration files.`);

      // 3. Get applied migrations
      const { rows } = await client.query('SELECT migration_name FROM schema_migrations');
      const appliedMigrations = new Set(rows.map(r => r.migration_name));

      // 4. Run pending migrations
      let count = 0;
      for (const file of files) {
        if (appliedMigrations.has(file)) {
          console.log(`⏭️  Skipping already applied migration: ${file}`);
          continue;
        }

        console.log(`➡️  Applying migration: ${file}...`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        
        // Use a transaction for each migration file
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO schema_migrations (migration_name) VALUES ($1)', [file]);
          await client.query('COMMIT');
          console.log(`✅ Applied: ${file}`);
          count++;
        } catch (err: any) {
          await client.query('ROLLBACK');
          console.error(`❌ Failed to apply migration ${file}:`, err.message);
          throw err;
        }
      }

      if (count === 0) {
        console.log('✨ Database is already up to date.');
      } else {
        console.log(`🎉 Successfully applied ${count} migrations.`);
      }

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await databaseService.disconnect();
  }
}

runMigrations();

