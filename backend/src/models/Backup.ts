import { databaseService } from '../services/database';
import { Product, ProductModel } from './Product';
import { auditLogModel } from './AuditLog';
import * as fs from 'fs';
import * as path from 'path';

export interface BackupMetadata {
  id?: number;
  backup_name: string;
  description?: string;
  created_by: string;
  product_count: number;
  file_path?: string;
  backup_data?: string; // JSON stringified product array (for DB storage)
  status: 'active' | 'promoted' | 'archived';
  promoted_at?: string;
  promoted_by?: string;
  created_at?: string;
}

export class BackupModel {
  private isPostgres: boolean;
  private backupDir: string;

  constructor() {
    this.isPostgres = databaseService.isPostgres();
    this.backupDir = path.join(__dirname, '../../data/backups');
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup(name: string, description: string, createdBy: string): Promise<BackupMetadata> {
    // Get all current products
    const productModel = new ProductModel();
    const products = await productModel.getAllProducts();
    
    const backupData = JSON.stringify(products, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup_${timestamp}.json`;
    const filePath = path.join(this.backupDir, fileName);
    
    // Save to file (for local redundancy)
    fs.writeFileSync(filePath, backupData, 'utf-8');

    if (this.isPostgres) {
      const client = await databaseService.getClient();
      try {
        const sql = `
          INSERT INTO backups (
            backup_name, description, created_by, product_count, 
            file_path, backup_data, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        
        const params = [
          name,
          description || null,
          createdBy,
          products.length,
          fileName,
          backupData,
          'active'
        ];

        const result = await client.query(sql, params);
        
        // Log the backup creation
        await auditLogModel.createLog({
          action: 'BACKUP',
          entity_type: 'backup',
          entity_id: result.rows[0].id.toString(),
          user_name: createdBy,
          changes_summary: `Created backup "${name}" with ${products.length} products`
        });

        return result.rows[0];
      } finally {
        client.release();
      }
    }

    // SQLite implementation
    const db = databaseService.getDatabase();
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO backups (
          backup_name, description, created_by, product_count, 
          file_path, backup_data, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        name,
        description || null,
        createdBy,
        products.length,
        fileName,
        backupData,
        'active'
      ];

      db.run(sql, params, async function(err) {
        if (err) {
          reject(err);
        } else {
          const backup: BackupMetadata = {
            id: this.lastID,
            backup_name: name,
            description,
            created_by: createdBy,
            product_count: products.length,
            file_path: fileName,
            status: 'active',
            created_at: new Date().toISOString()
          };
          
          // Log the backup creation
          await auditLogModel.createLog({
            action: 'BACKUP',
            entity_type: 'backup',
            entity_id: backup.id!.toString(),
            user_name: createdBy,
            changes_summary: `Created backup "${name}" with ${products.length} products`
          });

          resolve(backup);
        }
      });
    });
  }

  async getAllBackups(): Promise<BackupMetadata[]> {
    if (this.isPostgres) {
      const client = await databaseService.getClient();
      try {
        const result = await client.query(`
          SELECT id, backup_name, description, created_by, product_count, 
                 file_path, status, promoted_at, promoted_by, created_at
          FROM backups 
          ORDER BY created_at DESC
        `);
        return result.rows;
      } finally {
        client.release();
      }
    }

    const db = databaseService.getDatabase();
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT id, backup_name, description, created_by, product_count, 
               file_path, status, promoted_at, promoted_by, created_at
        FROM backups 
        ORDER BY created_at DESC
      `, [], (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async getBackupById(id: number): Promise<BackupMetadata | null> {
    if (this.isPostgres) {
      const client = await databaseService.getClient();
      try {
        const result = await client.query('SELECT * FROM backups WHERE id = $1', [id]);
        return result.rows[0] || null;
      } finally {
        client.release();
      }
    }

    const db = databaseService.getDatabase();
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM backups WHERE id = ?', [id], (err, row: any) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }

  async promoteBackup(id: number, promotedBy: string): Promise<{ success: boolean; message: string; productsRestored?: number }> {
    // Get the backup
    const backup = await this.getBackupById(id);
    if (!backup) {
      return { success: false, message: 'Backup not found' };
    }

    // Get the backup data
    let products: Product[];
    if (backup.backup_data) {
      products = JSON.parse(backup.backup_data);
    } else if (backup.file_path) {
      const filePath = path.join(this.backupDir, backup.file_path);
      if (!fs.existsSync(filePath)) {
        return { success: false, message: 'Backup file not found' };
      }
      products = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } else {
      return { success: false, message: 'No backup data available' };
    }

    // Get current products for audit log
    const productModel = new ProductModel();
    const currentProducts = await productModel.getAllProducts();

    if (this.isPostgres) {
      const client = await databaseService.getClient();
      try {
        await client.query('BEGIN');

        // Delete all current products
        await client.query('DELETE FROM products');

        // Insert all products from backup
        for (const product of products) {
          const sql = `
            INSERT INTO products (
              product_id, name, full_name, description, brand, industry,
              chemistry, url, image, benefits, applications, technical, sizing,
              color, cleanup, recommended_equipment, published, benefits_count, last_edited
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          `;
          
          await client.query(sql, [
            product.product_id, product.name, product.full_name || product.name, product.description,
            product.brand, product.industry, product.chemistry, product.url, product.image,
            JSON.stringify(product.benefits), JSON.stringify(product.applications),
            JSON.stringify(product.technical), JSON.stringify(product.sizing),
            product.color, product.cleanup, product.recommended_equipment,
            product.published, product.benefits_count || 0, product.last_edited
          ]);
        }

        // Update backup status
        await client.query(`
          UPDATE backups 
          SET status = 'promoted', promoted_at = $1, promoted_by = $2 
          WHERE id = $3
        `, [new Date().toISOString(), promotedBy, id]);

        await client.query('COMMIT');

        // Log the promotion
        await auditLogModel.createLog({
          action: 'RESTORE',
          entity_type: 'backup',
          entity_id: id.toString(),
          user_name: promotedBy,
          changes_summary: `Promoted backup "${backup.backup_name}" to production. Restored ${products.length} products (replaced ${currentProducts.length} products)`,
          before_data: JSON.stringify({ product_count: currentProducts.length }),
          after_data: JSON.stringify({ product_count: products.length })
        });

        return { success: true, message: `Successfully restored ${products.length} products from backup`, productsRestored: products.length };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    // SQLite implementation
    const db = databaseService.getDatabase();
    return new Promise((resolve, reject) => {
      db.serialize(async () => {
        db.run('BEGIN TRANSACTION');
        
        db.run('DELETE FROM products', async (err) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }

          let insertErrors = 0;
          for (const product of products) {
            const sql = `
              INSERT INTO products (
                product_id, name, full_name, description, brand, industry,
                chemistry, url, image, benefits, applications, technical, sizing,
                color, cleanup, recommended_equipment, published, benefits_count, last_edited
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            db.run(sql, [
              product.product_id, product.name, product.full_name || product.name, product.description,
              product.brand, product.industry, product.chemistry, product.url, product.image,
              JSON.stringify(product.benefits), JSON.stringify(product.applications),
              JSON.stringify(product.technical), JSON.stringify(product.sizing),
              product.color, product.cleanup, product.recommended_equipment,
              product.published ? 1 : 0, product.benefits_count || 0, product.last_edited
            ], (insertErr) => {
              if (insertErr) insertErrors++;
            });
          }

          db.run(`
            UPDATE backups 
            SET status = 'promoted', promoted_at = ?, promoted_by = ? 
            WHERE id = ?
          `, [new Date().toISOString(), promotedBy, id]);

          db.run('COMMIT', async () => {
            // Log the promotion
            await auditLogModel.createLog({
              action: 'RESTORE',
              entity_type: 'backup',
              entity_id: id.toString(),
              user_name: promotedBy,
              changes_summary: `Promoted backup "${backup.backup_name}" to production. Restored ${products.length} products`,
              before_data: JSON.stringify({ product_count: currentProducts.length }),
              after_data: JSON.stringify({ product_count: products.length })
            });

            resolve({ 
              success: true, 
              message: `Successfully restored ${products.length} products from backup`, 
              productsRestored: products.length 
            });
          });
        });
      });
    });
  }

  async deleteBackup(id: number, deletedBy: string): Promise<boolean> {
    const backup = await this.getBackupById(id);
    if (!backup) return false;

    // Delete file if exists
    if (backup.file_path) {
      const filePath = path.join(this.backupDir, backup.file_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    if (this.isPostgres) {
      const client = await databaseService.getClient();
      try {
        const result = await client.query('DELETE FROM backups WHERE id = $1', [id]);
        
        if ((result.rowCount || 0) > 0) {
          await auditLogModel.createLog({
            action: 'DELETE',
            entity_type: 'backup',
            entity_id: id.toString(),
            user_name: deletedBy,
            changes_summary: `Deleted backup "${backup.backup_name}"`
          });
        }
        
        return (result.rowCount || 0) > 0;
      } finally {
        client.release();
      }
    }

    const db = databaseService.getDatabase();
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM backups WHERE id = ?', [id], async function(err) {
        if (err) {
          reject(err);
        } else {
          if (this.changes > 0) {
            await auditLogModel.createLog({
              action: 'DELETE',
              entity_type: 'backup',
              entity_id: id.toString(),
              user_name: deletedBy,
              changes_summary: `Deleted backup "${backup.backup_name}"`
            });
          }
          resolve(this.changes > 0);
        }
      });
    });
  }

  async getBackupPreview(id: number): Promise<{ products: Partial<Product>[]; total: number } | null> {
    const backup = await this.getBackupById(id);
    if (!backup) return null;

    let products: Product[];
    if (backup.backup_data) {
      products = JSON.parse(backup.backup_data);
    } else if (backup.file_path) {
      const filePath = path.join(this.backupDir, backup.file_path);
      if (!fs.existsSync(filePath)) return null;
      products = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } else {
      return null;
    }

    // Return a preview with minimal product data
    const preview = products.slice(0, 20).map(p => ({
      product_id: p.product_id,
      name: p.name,
      brand: p.brand,
      industry: p.industry
    }));

    return { products: preview, total: products.length };
  }
}

export const backupModel = new BackupModel();

