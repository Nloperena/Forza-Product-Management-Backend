import { databaseService } from '../services/database';

export interface ContactSubmission {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  message: string;
  page_url?: string;
  ip_hash?: string;
  status: 'pending' | 'processed' | 'replied' | 'spam';
  internal_email_sent: boolean;
  confirmation_email_sent: boolean;
  internal_email_sent_at?: string;
  confirmation_email_sent_at?: string;
  email_error?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContactSubmissionInput {
  first_name: string;
  last_name: string;
  email: string;
  message: string;
  page_url?: string;
  ip_hash?: string;
}

export class ContactSubmissionModel {
  /**
   * Create a new contact submission
   */
  async create(input: CreateContactSubmissionInput): Promise<ContactSubmission> {
    if (!databaseService.isPostgres()) {
      throw new Error('ContactSubmissionModel requires PostgreSQL');
    }

    const client = await databaseService.getClient();
    try {
      const sql = `
        INSERT INTO contact_submissions (
          first_name, last_name, email, message, page_url, ip_hash
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const result = await client.query(sql, [
        input.first_name,
        input.last_name,
        input.email,
        input.message,
        input.page_url || null,
        input.ip_hash || null
      ]);

      return this.parseRow(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Get submission by ID
   */
  async getById(id: string): Promise<ContactSubmission | null> {
    if (!databaseService.isPostgres()) {
      throw new Error('ContactSubmissionModel requires PostgreSQL');
    }

    const client = await databaseService.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM contact_submissions WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.parseRow(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Update email send status
   */
  async updateEmailStatus(
    id: string,
    updates: {
      internal_email_sent?: boolean;
      confirmation_email_sent?: boolean;
      email_error?: string;
    }
  ): Promise<ContactSubmission | null> {
    if (!databaseService.isPostgres()) {
      throw new Error('ContactSubmissionModel requires PostgreSQL');
    }

    const client = await databaseService.getClient();
    try {
      const setClauses: string[] = ['updated_at = NOW()'];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.internal_email_sent !== undefined) {
        setClauses.push(`internal_email_sent = $${paramIndex}`);
        values.push(updates.internal_email_sent);
        paramIndex++;
        if (updates.internal_email_sent) {
          setClauses.push(`internal_email_sent_at = NOW()`);
        }
      }

      if (updates.confirmation_email_sent !== undefined) {
        setClauses.push(`confirmation_email_sent = $${paramIndex}`);
        values.push(updates.confirmation_email_sent);
        paramIndex++;
        if (updates.confirmation_email_sent) {
          setClauses.push(`confirmation_email_sent_at = NOW()`);
        }
      }

      if (updates.email_error !== undefined) {
        setClauses.push(`email_error = $${paramIndex}`);
        values.push(updates.email_error);
        paramIndex++;
      }

      values.push(id);

      const sql = `
        UPDATE contact_submissions 
        SET ${setClauses.join(', ')} 
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(sql, values);

      if (result.rows.length === 0) {
        return null;
      }

      return this.parseRow(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Count recent submissions from an IP hash (for rate limiting)
   */
  async countRecentByIp(ipHash: string, minutesAgo: number = 1): Promise<number> {
    if (!databaseService.isPostgres()) {
      throw new Error('ContactSubmissionModel requires PostgreSQL');
    }

    const client = await databaseService.getClient();
    try {
      const result = await client.query(
        `SELECT COUNT(*) as count FROM contact_submissions 
         WHERE ip_hash = $1 AND created_at > NOW() - INTERVAL '${minutesAgo} minutes'`,
        [ipHash]
      );

      return parseInt(result.rows[0].count, 10);
    } finally {
      client.release();
    }
  }

  private parseRow(row: any): ContactSubmission {
    return {
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      message: row.message,
      page_url: row.page_url,
      ip_hash: row.ip_hash,
      status: row.status,
      internal_email_sent: row.internal_email_sent,
      confirmation_email_sent: row.confirmation_email_sent,
      internal_email_sent_at: row.internal_email_sent_at?.toISOString(),
      confirmation_email_sent_at: row.confirmation_email_sent_at?.toISOString(),
      email_error: row.email_error,
      created_at: row.created_at?.toISOString(),
      updated_at: row.updated_at?.toISOString()
    };
  }
}

export const contactSubmissionModel = new ContactSubmissionModel();

