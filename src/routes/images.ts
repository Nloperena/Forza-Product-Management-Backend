import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
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

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
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

// GET /api/images - Get all uploaded images
router.get('/', (_req, res) => {
  try {
    const uploadDir = path.join(__dirname, '../../public/uploads');
    
    if (!fs.existsSync(uploadDir)) {
      res.json([]);
      return;
    }

    const files = fs.readdirSync(uploadDir);
    const images = files
      .filter(file => /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(file))
      .map(file => {
        const filePath = path.join(uploadDir, file);
        const stats = fs.statSync(filePath);
        
        return {
          filename: file,
          path: `/product-images/${file}`,
          size: stats.size,
          created: stats.birthtime
        };
      });

    res.json(images);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch images',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/images/upload - Upload new image
router.post('/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
      return;
    }

    const imageData = {
      filename: req.file.filename,
      path: `/product-images/${req.file.filename}`,
      size: req.file.size,
      originalname: req.file.originalname
    };

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      ...imageData
    });
  } catch (error) {
    console.error('Error uploading image:', error);
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
