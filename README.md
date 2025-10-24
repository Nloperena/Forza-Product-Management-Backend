# Forza Products Backend API

A comprehensive Node.js/Express backend API for the Forza Products Management System.

## 🚀 Features

- **RESTful API** for product management (CRUD operations)
- **SQLite Database** with full product data storage
- **File Upload** support for product images
- **Statistics API** with brand/industry analytics
- **TypeScript** for type safety and better development experience
- **Comprehensive Error Handling** with proper HTTP status codes
- **Rate Limiting** and security middleware
- **CORS** configuration for frontend integration
- **Database Seeding** with 199 Forza products

## 📋 API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `GET /api/products/statistics` - Get product statistics

### Images
- `GET /api/images` - Get all uploaded images
- `POST /api/images/upload` - Upload new image
- `DELETE /api/images/:filename` - Delete image

### Statistics
- `GET /api/statistics` - Get comprehensive statistics

### Health Check
- `GET /health` - Server health status

## 🛠 Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Build the Project**
   ```bash
   npm run build
   ```

4. **Seed the Database** (First time only)
   ```bash
   npm run seed
   ```

5. **Start the Server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 📊 Database Schema

### Products Table
- `id` - Primary key (same as product_id)
- `product_id` - Unique product identifier
- `name` - Product name
- `full_name` - Complete product name
- `description` - Product description
- `brand` - Product brand (forza_bond, forza_seal, forza_tape)
- `industry` - Industry category
- `chemistry` - Chemical composition
- `url` - Product URL
- `image` - Image path
- `benefits` - JSON array of benefits
- `applications` - JSON array of applications
- `technical` - JSON array of technical properties
- `sizing` - JSON array of available sizes
- `published` - Publication status
- `benefits_count` - Number of benefits
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp
- `last_edited` - Last edited timestamp

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run seed` - Seed database with Forza products
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm test` - Run tests

### Project Structure
```
backend/
├── src/
│   ├── controllers/     # Route controllers
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── middleware/     # Custom middleware
│   ├── services/       # Business logic services
│   ├── scripts/        # Database scripts
│   └── server.ts       # Main server file
├── public/
│   └── uploads/        # File upload directory
├── data/              # SQLite database files
└── dist/              # Compiled JavaScript
```

## 🔌 Frontend Integration

The backend is designed to work seamlessly with the frontend React application:

1. **CORS** is configured for `http://localhost:3000`
2. **API endpoints** match the frontend's expected structure
3. **Static files** are served from `/public` and `/product-images`
4. **Error responses** follow consistent JSON format

### Frontend API Configuration
Update your frontend's API service to point to:
```typescript
const API_BASE = 'http://localhost:5000/api';
```

## 📈 Performance Features

- **Database Indexing** on commonly queried fields
- **Connection Pooling** with SQLite WAL mode
- **Request Compression** with gzip
- **Rate Limiting** to prevent abuse
- **File Upload Limits** (5MB max per file)
- **Error Handling** with proper HTTP status codes

## 🔒 Security Features

- **Helmet.js** for security headers
- **CORS** configuration
- **Rate Limiting** (100 requests per 15 minutes)
- **File Upload Validation** (image types only)
- **Input Validation** and sanitization
- **Error Message Sanitization** in production

## 🚀 Deployment

### Environment Variables
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `FRONTEND_URL` - Frontend URL for CORS
- `DB_PATH` - Database file path

### Production Considerations
- Set `NODE_ENV=production`
- Configure proper CORS origins
- Set up file upload limits
- Configure rate limiting
- Set up logging and monitoring
- Use a reverse proxy (nginx) for static files

## 📝 API Examples

### Create Product
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "TEST-001",
    "name": "Test Product",
    "full_name": "Test Product Full Name",
    "description": "Test description",
    "brand": "forza_bond",
    "industry": "industrial_industry",
    "benefits": ["Benefit 1", "Benefit 2"],
    "applications": ["Application 1"],
    "technical": [{"property": "Viscosity", "value": "100", "unit": "cps"}]
  }'
```

### Upload Image
```bash
curl -X POST http://localhost:5000/api/images/upload \
  -F "image=@product-image.jpg"
```

### Get Statistics
```bash
curl http://localhost:5000/api/statistics
```

## 🐛 Troubleshooting

### Common Issues
1. **Database not found**: Run `npm run seed` first
2. **Port already in use**: Change PORT in .env
3. **CORS errors**: Check FRONTEND_URL in .env
4. **File upload fails**: Check uploads directory permissions

### Logs
- Development: Console output with Morgan logging
- Production: Configure proper logging service
- Database errors: Check SQLite file permissions












