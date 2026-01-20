import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { put, list } from '@vercel/blob';

const router = express.Router();

// Configure multer for file uploads - use memory storage for Vercel Blob uploads
const memoryStorage = multer.memoryStorage();

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/uploads');
    
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Use memory storage for Vercel Blob uploads
const uploadToBlob = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Use disk storage for local uploads
const upload = multer({
  storage: diskStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// GET /api/images - Get all images from Vercel Blob + local
// Supports ?prefix= for folder navigation
router.get('/', async (req, res) => {
  try {
    const blobToken = process.env.PRODUCTS_READ_WRITE_TOKEN || 
                      process.env.BLOB_READ_WRITE_TOKEN || 
                      process.env.Images_READ_WRITE_TOKEN || 
                      Object.keys(process.env).find(key => key.endsWith('_READ_WRITE_TOKEN') && process.env[key]);

    const prefix = (req.query.prefix as string) || '';
    let items: Array<{url: string; pathname: string; size?: number; isFolder?: boolean}> = [];
    let folders: string[] = [];
    
    // Fetch from Vercel Blob if token is available
    if (blobToken) {
      try {
        const { blobs } = await list({ 
          token: blobToken,
          prefix: prefix || undefined
        });
        
        // Track unique folder paths at current level
        const folderSet = new Set<string>();
        
        blobs.forEach(blob => {
          // Get path relative to current prefix
          const relativePath = prefix ? blob.pathname.replace(prefix, '') : blob.pathname;
          const parts = relativePath.split('/').filter(p => p);
          
          if (parts.length > 1) {
            // This is inside a subfolder - add the folder
            folderSet.add(parts[0]);
          } else if (parts.length === 1 && /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(blob.pathname)) {
            // This is a file at the current level
            items.push({
              url: blob.url,
              pathname: blob.pathname,
              size: blob.size,
              isFolder: false
            });
          }
        });
        
        folders = Array.from(folderSet).sort();
      } catch (blobError) {
        console.error('Error fetching from Vercel Blob:', blobError);
      }
    }

    // Also fetch local images if at root and they exist
    if (!prefix) {
      const uploadDir = path.join(__dirname, '../../public/uploads');
      if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir);
        const localImages = files
          .filter(file => /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(file))
          .map(file => {
            const filePath = path.join(uploadDir, file);
            const stats = fs.statSync(filePath);
            return {
              url: `/product-images/${file}`,
              pathname: `local/${file}`,
              size: stats.size,
              isFolder: false
            };
          });
        items = [...items, ...localImages];
      }
    }

    res.json({
      success: true,
      currentPath: prefix,
      folders: folders,
      images: items
    });
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch images',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/images/upload - Upload to product-specific folder
router.post('/upload', uploadToBlob.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file provided' });
      return;
    }

    const blobToken = process.env.PRODUCTS_READ_WRITE_TOKEN || 
                      process.env.BLOB_READ_WRITE_TOKEN || 
                      process.env.Images_READ_WRITE_TOKEN || 
                      Object.keys(process.env).find(key => key.endsWith('_READ_WRITE_TOKEN') && process.env[key]);

    if (!blobToken) {
      res.status(500).json({ success: false, message: 'Vercel Blob not configured' });
      return;
    }

    const productId = req.body.product_id || req.body.productId;
    const uploadType = req.body.type || 'image'; // 'image', 'tds', or 'sds'
    
    if (!productId) {
      res.status(400).json({ success: false, message: 'Product ID is required for folder organization' });
      return;
    }

    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    // Create the "folder" structure: product-data/[ProductID]/[type].[extension]
    // We use the type as the filename to keep it perfectly consistent
    const folderPath = `product-data/${productId}/${uploadType}${fileExtension}`;

    const blob = await put(folderPath, req.file.buffer, {
      access: 'public',
      contentType: req.file.mimetype,
      token: blobToken,
      addRandomSuffix: false // Keep the name clean as requested
    });

    res.json({
      success: true,
      message: `${uploadType} uploaded to product folder`,
      url: blob.url,
      filename: folderPath
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Upload failed', error: error instanceof Error ? error.message : 'Unknown' });
  }
});

// POST /api/images/upload-local - Upload image to local Heroku storage (fallback)
router.post('/upload-local', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
      return;
    }

    // Get the Heroku app URL
    const baseUrl = process.env.HEROKU_APP_URL || 'https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com';
    
    const imageData = {
      filename: req.file.filename,
      url: `${baseUrl}/product-images/${req.file.filename}`,
      size: req.file.size,
      originalname: req.file.originalname
    };

    res.json({
      success: true,
      message: 'Image uploaded successfully to local storage',
      ...imageData
    });
  } catch (error) {
    console.error('Error uploading image locally:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/images/:filename - Delete image
router.delete('/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../../public/uploads', filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        message: 'Image not found'
      });
      return;
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/images/placeholder/:text - Generate placeholder image
router.get('/placeholder/:text', (req, res) => {
  try {
    const text = decodeURIComponent(req.params.text);
    const width = parseInt(req.query.width as string) || 300;
    const height = parseInt(req.query.height as string) || 200;
    
    // Create a simple SVG placeholder
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial, sans-serif" font-size="14" fill="#666">
          ${text}
        </text>
      </svg>
    `;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
    res.send(svg);
  } catch (error) {
    console.error('Error generating placeholder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate placeholder image'
    });
  }
});

export default router;
