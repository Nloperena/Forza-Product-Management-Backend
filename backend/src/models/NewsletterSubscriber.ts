import { databaseService } from '../services/database';
import crypto from 'crypto';

export interface NewsletterSubscriber {
  id: string;
  email: string;
  status: 'pending' | 'subscribed' | 'unsubscribed';
  source?: string;
  page_url?: string;
  ip_hash?: string;
  confirm_token?: string;
  confirm_expires_at?: string;
  confirmed_at?: string;
  unsubscribe_token: string;
  unsubscribed_at?: string;
  welcome_email_sent: boolean;
  welcome_email_sent_at?: string;
  email_error?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSubscriberInput {
  email: string;
  source?: string;
  page_url?: string;
  ip_hash?: string;
}

export interface NewsletterSubscriberListOptions {
  page?: number;
  limit?: number;
  status?: NewsletterSubscriber['status'];
  search?: string;
}

export class NewsletterSubscriberModel {
  /**
   * Create or update a subscriber (upsert)
   * Returns the subscriber and whether it was newly created
   */
  async upsert(input: CreateSubscriberInput): Promise<{ subscriber: NewsletterSubscriber; created: boolean }> {
    if (!databaseService.isPostgres()) {
      throw new Error('NewsletterSubscriberModel requires PostgreSQL');
    }

    const client = await databaseService.getClient();
    try {
      // Check if subscriber already exists
      const existing = await client.query(
        'SELECT * FROM newsletter_subscribers WHERE email = $1',
        [input.email.toLowerCase()]
      );

      if (existing.rows.length > 0) {
        const existingSubscriber = this.parseRow(existing.rows[0]);
        
        // If unsubscribed, they need to go through the flow again
        if (existingSubscriber.status === 'unsubscribed') {
          // Reset for re-subscription
          const confirmToken = this.generateToken();
          const unsubscribeToken = this.generateToken();
          const confirmExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

          const result = await client.query(`
            UPDATE newsletter_subscribers 
            SET status = 'pending',
                confirm_token = $1,
                confirm_expires_at = $2,
                unsubscribe_token = $3,
                unsubscribed_at = NULL,
                welcome_email_sent = false,
                email_error = NULL,
                source = COALESCE($4, source),
                page_url = COALESCE($5, page_url),
                ip_hash = COALESCE($6, ip_hash),
                updated_at = NOW()
            WHERE email = $7
            RETURNING *
          `, [
            confirmToken,
            confirmExpiresAt,
            unsubscribeToken,
            input.source,
            input.page_url,
            input.ip_hash,
            input.email.toLowerCase()
          ]);

          return { subscriber: this.parseRow(result.rows[0]), created: false };
        }

        // Already subscribed or pending - just return existing
        return { subscriber: existingSubscriber, created: false };
      }

      // Create new subscriber with pending status (double opt-in)
      const confirmToken = this.generateToken();
      const unsubscribeToken = this.generateToken();
      const confirmExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const result = await client.query(`
        INSERT INTO newsletter_subscribers (
          email, status, source, page_url, ip_hash,
          confirm_token, confirm_expires_at, unsubscribe_token
        ) VALUES ($1, 'pending', $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        input.email.toLowerCase(),
        input.source || null,
        input.page_url || null,
        input.ip_hash || null,
        confirmToken,
        confirmExpiresAt,
        unsubscribeToken
      ]);

      return { subscriber: this.parseRow(result.rows[0]), created: true };
    } finally {
      client.release();
    }
  }

  /**
   * Find subscriber by confirmation token
   */
  async findByConfirmToken(token: string): Promise<NewsletterSubscriber | null> {
    if (!databaseService.isPostgres()) {
      throw new Error('NewsletterSubscriberModel requires PostgreSQL');
    }

    const client = await databaseService.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM newsletter_subscribers WHERE confirm_token = $1',
        [token]
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
   * Find subscriber by unsubscribe token
   */
  async findByUnsubscribeToken(token: string): Promise<NewsletterSubscriber | null> {
    if (!databaseService.isPostgres()) {
      throw new Error('NewsletterSubscriberModel requires PostgreSQL');
    }

    const client = await databaseService.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM newsletter_subscribers WHERE unsubscribe_token = $1',
        [token]
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
   * Find subscriber by email
   */
  async findByEmail(email: string): Promise<NewsletterSubscriber | null> {
    if (!databaseService.isPostgres()) {
      throw new Error('NewsletterSubscriberModel requires PostgreSQL');
    }

    const client = await databaseService.getClient();
    try {
      const result = await client.query(
        'SELECT * FROM newsletter_subscribers WHERE email = $1',
        [email.toLowerCase()]
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
   * Confirm subscription (complete double opt-in)
   */
  async confirmSubscription(token: string): Promise<NewsletterSubscriber | null> {
    if (!databaseService.isPostgres()) {
      throw new Error('NewsletterSubscriberModel requires PostgreSQL');
    }

    const client = await databaseService.getClient();
    try {
      const result = await client.query(`
        UPDATE newsletter_subscribers 
        SET status = 'subscribed',
            confirm_token = NULL,
            confirm_expires_at = NULL,
            confirmed_at = NOW(),
            updated_at = NOW()
        WHERE confirm_token = $1 
          AND status = 'pending'
          AND (confirm_expires_at IS NULL OR confirm_expires_at > NOW())
        RETURNING *
      `, [token]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.parseRow(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Unsubscribe
   */
  async unsubscribe(token: string): Promise<NewsletterSubscriber | null> {
    if (!databaseService.isPostgres()) {
      throw new Error('NewsletterSubscriberModel requires PostgreSQL');
    }

    const client = await databaseService.getClient();
    try {
      // Find by token first to ensure it's valid
      const result = await client.query(
        'SELECT * FROM newsletter_subscribers WHERE unsubscribe_token = $1',
        [token]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const subscriber = this.parseRow(result.rows[0]);

      // If already unsubscribed, just return the subscriber object
      if (subscriber.status === 'unsubscribed') {
        return subscriber;
      }

      // Otherwise update status
      const updateResult = await client.query(`
        UPDATE newsletter_subscribers 
        SET status = 'unsubscribed',
            unsubscribed_at = NOW(),
            updated_at = NOW()
        WHERE unsubscribe_token = $1
        RETURNING *
      `, [token]);

      return this.parseRow(updateResult.rows[0]);
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
      welcome_email_sent?: boolean;
      email_error?: string;
    }
  ): Promise<NewsletterSubscriber | null> {
    if (!databaseService.isPostgres()) {
      throw new Error('NewsletterSubscriberModel requires PostgreSQL');
    }

    const client = await databaseService.getClient();
    try {
      const setClauses: string[] = ['updated_at = NOW()'];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.welcome_email_sent !== undefined) {
        setClauses.push(`welcome_email_sent = $${paramIndex}`);
        values.push(updates.welcome_email_sent);
        paramIndex++;
        if (updates.welcome_email_sent) {
          setClauses.push(`welcome_email_sent_at = NOW()`);
        }
      }

      if (updates.email_error !== undefined) {
        setClauses.push(`email_error = $${paramIndex}`);
        values.push(updates.email_error);
        paramIndex++;
      }

      values.push(id);

      const sql = `
        UPDATE newsletter_subscribers 
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
   * Check if an email is subscribed (for preventing emails to unsubscribed users)
   */
  async isSubscribed(email: string): Promise<boolean> {
    const subscriber = await this.findByEmail(email);
    return subscriber?.status === 'subscribed';
  }

  /**
   * List newsletter subscribers for admin reporting UI
   */
  async list(
    options: NewsletterSubscriberListOptions = {}
  ): Promise<{ items: NewsletterSubscriber[]; total: number }> {
    if (!databaseService.isPostgres()) {
      throw new Error('NewsletterSubscriberModel requires PostgreSQL');
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 25));
    const offset = (page - 1) * limit;
    const search = options.search?.trim();

    const whereParts: string[] = [];
    const whereValues: any[] = [];
    let paramIndex = 1;

    if (options.status) {
      whereParts.push(`status = $${paramIndex}`);
      whereValues.push(options.status);
      paramIndex++;
    }

    if (search) {
      whereParts.push(`(email ILIKE $${paramIndex} OR source ILIKE $${paramIndex})`);
      whereValues.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    const client = await databaseService.getClient();
    try {
      const totalResult = await client.query(
        `SELECT COUNT(*) as count FROM newsletter_subscribers ${whereClause}`,
        whereValues
      );
      const total = parseInt(totalResult.rows[0].count, 10);

      const listValues = [...whereValues, limit, offset];
      const listResult = await client.query(
        `
          SELECT *
          FROM newsletter_subscribers
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `,
        listValues
      );

      return {
        items: listResult.rows.map((row) => this.parseRow(row)),
        total
      };
    } finally {
      client.release();
    }
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private parseRow(row: any): NewsletterSubscriber {
    return {
      id: row.id,
      email: row.email,
      status: row.status,
      source: row.source,
      page_url: row.page_url,
      ip_hash: row.ip_hash,
      confirm_token: row.confirm_token,
      confirm_expires_at: row.confirm_expires_at?.toISOString(),
      confirmed_at: row.confirmed_at?.toISOString(),
      unsubscribe_token: row.unsubscribe_token,
      unsubscribed_at: row.unsubscribed_at?.toISOString(),
      welcome_email_sent: row.welcome_email_sent,
      welcome_email_sent_at: row.welcome_email_sent_at?.toISOString(),
      email_error: row.email_error,
      created_at: row.created_at?.toISOString(),
      updated_at: row.updated_at?.toISOString()
    };
  }
}

export const newsletterSubscriberModel = new NewsletterSubscriberModel();

