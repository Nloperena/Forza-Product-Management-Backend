/**
 * Admin Routes (Protected)
 * 
 * These endpoints require the ADMIN_TOKEN header for access.
 * 
 * GET /admin/migrations - List applied migrations
 * GET /admin/health/details - Detailed health info
 */

import express, { Request, Response, NextFunction } from 'express';
import { databaseService } from '../services/database';
import { emailService } from '../services/emailService';

const router = express.Router();

/**
 * Admin Token Middleware
 */
function requireAdminToken(req: Request, res: Response, next: NextFunction) {
  const adminToken = process.env.ADMIN_TOKEN;
  const providedToken = req.headers['x-admin-token'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!adminToken) {
    return res.status(503).json({ 
      ok: false, 
      error: 'Admin access not configured' 
    });
  }

  if (providedToken !== adminToken) {
    return res.status(401).json({ 
      ok: false, 
      error: 'Unauthorized' 
    });
  }

  return next();
}

// Apply middleware to all admin routes
router.use(requireAdminToken);

/**
 * GET /admin/migrations
 * Returns list of applied migrations
 */
router.get('/migrations', async (_req: Request, res: Response) => {
  try {
    if (!databaseService.isPostgres()) {
      return res.status(200).json({
        ok: true,
        database: 'sqlite',
        migrations: [],
        message: 'SQLite uses internal auto-init, no migration tracking'
      });
    }

    const client = await databaseService.getClient();
    try {
      // Check if schema_migrations table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'schema_migrations'
        )
      `);

      if (!tableCheck.rows[0].exists) {
        return res.status(200).json({
          ok: true,
          migrations: [],
          message: 'No migrations have been run yet (schema_migrations table does not exist)'
        });
      }

      const result = await client.query(`
        SELECT migration_name, applied_at 
        FROM schema_migrations 
        ORDER BY applied_at DESC
      `);

      return res.status(200).json({
        ok: true,
        count: result.rows.length,
        migrations: result.rows.map(r => ({
          name: r.migration_name,
          appliedAt: r.applied_at
        }))
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('[Admin] Error fetching migrations:', error.message);
    return res.status(500).json({ 
      ok: false, 
      error: 'Failed to fetch migrations' 
    });
  }
});

/**
 * GET /admin/health/details
 * Returns detailed health information
 */
router.get('/health/details', async (_req: Request, res: Response) => {
  const details = {
    ok: true,
    timestamp: new Date().toISOString(),
    app: {
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime()
    },
    database: {
      connected: false,
      type: databaseService.isPostgres() ? 'postgresql' : 'sqlite'
    },
    migrations: {
      count: 0,
      latest: null as string | null
    },
    email: {
      postmarkConfigured: emailService.isConfigured(),
      fromEmail: process.env.EMAIL_FROM || 'not set',
      teamEmail: process.env.TEAM_EMAIL || 'not set'
    },
    security: {
      ipHashSaltConfigured: !!process.env.IP_HASH_SALT,
      adminTokenConfigured: !!process.env.ADMIN_TOKEN
    }
  };

  try {
    // Check DB
    if (databaseService.isPostgres()) {
      const client = await databaseService.getClient();
      try {
        await client.query('SELECT 1');
        details.database.connected = true;

        // Get migration info
        const tableCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'schema_migrations'
          )
        `);

        if (tableCheck.rows[0].exists) {
          const migrationResult = await client.query(`
            SELECT COUNT(*) as count, MAX(migration_name) as latest 
            FROM schema_migrations
          `);
          details.migrations.count = parseInt(migrationResult.rows[0].count, 10);
          details.migrations.latest = migrationResult.rows[0].latest;
        }
      } finally {
        client.release();
      }
    } else {
      const db = databaseService.getDatabase();
      await new Promise((resolve, reject) => {
        db.get('SELECT 1', (err) => {
          if (err) reject(err);
          else resolve(true);
        });
      });
      details.database.connected = true;
    }

    return res.status(200).json(details);
  } catch (error: any) {
    details.ok = false;
    console.error('[Admin] Health details error:', error.message);
    return res.status(503).json({
      ...details,
      error: 'Database connection failed'
    });
  }
});

export default router;

