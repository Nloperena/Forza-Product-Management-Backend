import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Import routes
import productRoutes from './routes/products';
import imageRoutes from './routes/images';
import statsRoutes from './routes/statistics';
import backupRoutes from './routes/backups';
import auditLogRoutes from './routes/auditLogs';
import contactRoutes from './routes/contact';
import newsletterRoutes from './routes/newsletter';
import adminRoutes from './routes/admin';

// Import services
import { databaseService } from './services/database';
import { emailService } from './services/emailService';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// Load environment variables
dotenv.config();

/**
 * Validate required environment variables at startup
 * In production: logs warnings but does NOT exit (allows health checks to work)
 */
function validateEnv() {
  const required = [
    'POSTMARK_API_TOKEN',
    'EMAIL_FROM',
    'TEAM_EMAIL',
    'IP_HASH_SALT',
    'FRONTEND_URL'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missing.join(', ')}`);
    console.warn('⚠️ Some features (email sending) will be disabled until these are set.');
  } else {
    console.log('✅ All required environment variables are set');
  }
}

const app = express();
const PORT = process.env['PORT'] || 5000;

// Validate env vars before starting
validateEnv();

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// CORS configuration - allow all Vercel domains and localhost
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:8080', // Local development on 8080
  'https://product-mangement-system-template-s.vercel.app', // Current Vercel domain
  'https://forza-built-com.vercel.app', // Forza Built app
  process.env['FRONTEND_URL'] || 'http://localhost:3000'
];

// Allow all Vercel preview deployments (*.vercel.app)
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // In development, be more permissive
    if (process.env.NODE_ENV !== 'production') {
      // Allow localhost on any port for development
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        return callback(null, true);
      }
    }
    
    // Allow all Vercel domains
    if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS: Rejected origin: ${origin}`);
      // Don't throw error - just reject with false to send 403 instead of 500
      callback(null, false);
    }
  },
  credentials: false, // Changed to false to match frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
  allowedHeaders: [
    'Origin', 
    'X-Requested-With', 
    'Content-Type', 
    'Accept', 
    'Authorization',
    'Access-Control-Allow-Origin'
  ],
  exposedHeaders: ['Content-Length', 'Content-Type']
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased for development)
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Custom morgan token for hashed IP
morgan.token('hashed-ip', (req: any) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || 
             req.ip || 
             req.socket.remoteAddress || 
             'unknown';
  const salt = process.env.IP_HASH_SALT || 'forza-default-salt';
  return crypto.createHash('sha256').update(ip + salt).digest('hex').substring(0, 16);
});

// Logging middleware with privacy (no raw IPs)
const morganFormat = process.env.NODE_ENV === 'production' 
  ? ':hashed-ip - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
  : 'dev';
app.use(morgan(morganFormat));

// Safer debugging middleware using response finish event
app.use((req, res, next) => {
  console.log(`\n🔍 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log(`   Origin: ${req.headers.origin || 'No origin'}`);
  console.log(`   User-Agent: ${req.headers['user-agent'] || 'No user-agent'}`);
  
  // Log response info once the response is finished (safer than monkey-patching)
  res.on('finish', () => {
    console.log(`   Response status: ${res.statusCode}`);
    console.log(`   Response headers:`, JSON.stringify(res.getHeaders(), null, 2));
  });
  
  next();
});

// Handle preflight requests explicitly
app.options('*', (req, res) => {
  console.log(`🔄 Handling preflight request for ${req.url}`);
  res.status(200).end();
});

// Serve product images directly from /product-images URL
app.use('/product-images', express.static(path.join(__dirname, '../public/uploads/product-images'), {
  setHeaders: (res, filePath) => {
    // Apply CORS headers to all static assets
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

    // Apply stronger caching to images
    if (filePath.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
    }
  }
}));

// Serve scraped images from /scraped-images URL
app.use('/scraped-images', express.static(path.join(__dirname, '../public/scraped-images'), {
  setHeaders: (res, filePath) => {
    // Apply CORS headers to all static assets
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

    // Apply stronger caching to images
    if (filePath.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
    }
  }
}));


// Health check endpoint (Liveness)
app.get('/health', async (_req, res) => {
  const health = {
    ok: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    checks: {
      database: false
    }
  };

  try {
    if (databaseService.isPostgres()) {
      const client = await databaseService.getClient();
      try {
        await client.query('SELECT 1');
        health.checks.database = true;
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
      health.checks.database = true;
    }

    res.status(health.ok ? 200 : 503).json(health);
  } catch (error: any) {
    console.error('Liveness check failed:', error.message);
    res.status(503).json({
      ok: false,
      status: 'Unhealthy',
      error: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Readiness endpoint (Detailed dependency check)
app.get('/ready', async (_req, res) => {
  const readiness = {
    ok: true,
    status: 'Ready',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    checks: {
      database: false,
      postmark: false
    }
  };

  try {
    // Check DB
    if (databaseService.isPostgres()) {
      const client = await databaseService.getClient();
      try {
        await client.query('SELECT 1');
        readiness.checks.database = true;
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
      readiness.checks.database = true;
    }

    // Check Postmark
    readiness.checks.postmark = emailService.isConfigured();

    // Note: We return 200 even if Postmark is not configured, 
    // but the 'ok' flag and checks will reflect the state.
    // Only DB failure causes a non-200 if it makes the app unusable.
    if (!readiness.checks.database) {
      readiness.ok = false;
      readiness.status = 'Not Ready';
      return res.status(503).json(readiness);
    }

    return res.status(200).json(readiness);
  } catch (error: any) {
    console.error('Readiness check failed:', error.message);
    return res.status(503).json({
      ok: false,
      status: 'Error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.use('/api/products', productRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/statistics', statsRoutes);
app.use('/api/backups', backupRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/admin', adminRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Initialize database connection
    console.log('Initializing database...');
    await databaseService.connect();
    await databaseService.initializeDatabase();
    
    // Initialize ProductModel to create tables
    const { ProductModel } = require('./models/Product');
    
    console.log('🔍 Database type check:');
    console.log('  DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('  isPostgres():', databaseService.isPostgres());
    
    try {
      if (databaseService.isPostgres()) {
        console.log('🐘 Using PostgreSQL - initializing ProductModel without database instance');
        new ProductModel();
      } else {
        console.log('📁 Using SQLite - initializing ProductModel with database instance');
        new ProductModel(databaseService.getDatabase());
      }
      console.log('✅ Database tables initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing ProductModel:', error);
      throw error;
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🖼️  Static files: http://localhost:${PORT}/public`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    console.error('Error details:', error);
    process.exit(1);
  }
}

startServer();

export default app;
