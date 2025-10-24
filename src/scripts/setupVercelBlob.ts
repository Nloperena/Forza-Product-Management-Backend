import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

class VercelBlobSetup {
  private envPath: string;

  constructor() {
    this.envPath = path.join(__dirname, '../../.env');
  }

  async setupVercelBlob(): Promise<void> {
    try {
      console.log('🔧 Setting up Vercel Blob storage...');
      
      // Load existing .env file
      dotenv.config();
      
      const currentToken = process.env.VERCEL_BLOB_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
      
      if (currentToken) {
        console.log('✅ Vercel Blob token is already configured');
        console.log(`   Token: ${currentToken.substring(0, 10)}...`);
        return;
      }
      
      console.log('\n📝 To set up Vercel Blob storage, you need to:');
      console.log('1. Go to https://vercel.com/dashboard');
      console.log('2. Navigate to your project settings');
      console.log('3. Go to the "Storage" tab');
      console.log('4. Create a new Blob store or use an existing one');
      console.log('5. Copy the "Read and Write" token');
      console.log('\n💡 Then add it to your .env file:');
      console.log('   VERCEL_BLOB_TOKEN=your_token_here');
      
      // Check if .env file exists
      if (!fs.existsSync(this.envPath)) {
        console.log('\n📄 Creating .env file...');
        const envContent = `# Vercel Blob Storage
VERCEL_BLOB_TOKEN=your_vercel_blob_token_here

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Database Configuration
DB_PATH=./data/products.db

# JWT Configuration (for future authentication)
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=30d

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./public/uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
`;
        fs.writeFileSync(this.envPath, envContent);
        console.log('✅ .env file created');
      } else {
        console.log('\n📄 .env file already exists');
        console.log('   Add VERCEL_BLOB_TOKEN=your_token_here to it');
      }
      
      console.log('\n🚀 After setting up the token, run:');
      console.log('   npm run upload-to-vercel');
      
    } catch (error) {
      console.error('❌ Error setting up Vercel Blob:', error);
    }
  }
}

// Run the script
if (require.main === module) {
  const setup = new VercelBlobSetup();
  setup.setupVercelBlob();
}

export { VercelBlobSetup };
