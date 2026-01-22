import { databaseService } from '../services/database';

export interface AuditLogEntry {
  id?: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'BACKUP';
  entity_type: 'product' | 'backup' | 'system';
  entity_id: string;
  user_name: string;
  user_email?: string;
  changes_summary: string;
  before_data?: string; // JSON stringified
  after_data?: string;  // JSON stringified
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

export class AuditLogModel {
  private isPostgres: boolean;

  constructor() {
    this.isPostgres = databaseService.isPostgres();
  }

  async createLog(entry: Omit<AuditLogEntry, 'id' | 'created_at'>): Promise<AuditLogEntry> {
    if (this.isPostgres) {
      const client = await databaseService.getClient();
      try {
        const sql = `
          INSERT INTO audit_logs (
            action, entity_type, entity_id, user_name, user_email,
            changes_summary, before_data, after_data, ip_address, user_agent
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `;
        
        const params = [
          entry.action,
          entry.entity_type,
          entry.entity_id,
          entry.user_name,
          entry.user_email || null,
          entry.changes_summary,
          entry.before_data || null,
          entry.after_data || null,
          entry.ip_address || null,
          entry.user_agent || null
        ];

        const result = await client.query(sql, params);
        return result.rows[0];
      } finally {
        client.release();
      }
    }

    // SQLite implementation
    const db = databaseService.getDatabase();
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO audit_logs (
          action, entity_type, entity_id, user_name, user_email,
          changes_summary, before_data, after_data, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        entry.action,
        entry.entity_type,
        entry.entity_id,
        entry.user_name,
        entry.user_email || null,
        entry.changes_summary,
        entry.before_data || null,
        entry.after_data || null,
        entry.ip_address || null,
        entry.user_agent || null
      ];

      db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            ...entry,
            created_at: new Date().toISOString()
          });
        }
      });
    });
  }

  async getLogs(options: {
    entity_type?: string;
    entity_id?: string;
    action?: string;
    user_name?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ logs: AuditLogEntry[]; total: number }> {
    const { entity_type, entity_id, action, user_name, limit = 50, offset = 0 } = options;
    
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (entity_type) {
      whereConditions.push(this.isPostgres ? `entity_type = $${paramIndex++}` : 'entity_type = ?');
      params.push(entity_type);
    }
    if (entity_id) {
      whereConditions.push(this.isPostgres ? `entity_id = $${paramIndex++}` : 'entity_id = ?');
      params.push(entity_id);
    }
    if (action) {
      whereConditions.push(this.isPostgres ? `action = $${paramIndex++}` : 'action = ?');
      params.push(action);
    }
    if (user_name) {
      whereConditions.push(this.isPostgres ? `user_name ILIKE $${paramIndex++}` : 'user_name LIKE ?');
      params.push(this.isPostgres ? `%${user_name}%` : `%${user_name}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    if (this.isPostgres) {
      const client = await databaseService.getClient();
      try {
        // Get total count
        const countSql = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`;
        const countResult = await client.query(countSql, params);
        const total = parseInt(countResult.rows[0].total);

        // Get logs with pagination
        const sql = `
          SELECT * FROM audit_logs 
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;
        const logsResult = await client.query(sql, [...params, limit, offset]);
        
        return { logs: logsResult.rows, total };
      } finally {
        client.release();
      }
    }

    // SQLite implementation
    const db = databaseService.getDatabase();
    return new Promise((resolve, reject) => {
      const countSql = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`;
      
      db.get(countSql, params, (err, countRow: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        const total = countRow?.total || 0;
        const sql = `
          SELECT * FROM audit_logs 
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `;
        
        db.all(sql, [...params, limit, offset], (err2, rows: any[]) => {
          if (err2) {
            reject(err2);
          } else {
            resolve({ logs: rows || [], total });
          }
        });
      });
    });
  }

  async getLogById(id: number): Promise<AuditLogEntry | null> {
    if (this.isPostgres) {
      const client = await databaseService.getClient();
      try {
        const result = await client.query('SELECT * FROM audit_logs WHERE id = $1', [id]);
        return result.rows[0] || null;
      } finally {
        client.release();
      }
    }

    const db = databaseService.getDatabase();
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM audit_logs WHERE id = ?', [id], (err, row: any) => {
        if (err) reject(err);
        else resolve(row || null);
      });
    });
  }
}

export const auditLogModel = new AuditLogModel();

