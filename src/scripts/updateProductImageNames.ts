import * as fs from 'fs';
import * as path from 'path';
import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';

// Mapping of product_id to new image filename
const PRODUCT_IMAGE_MAPPING: Record<string, string> = {
  // Composites
  'TAC-734G': 'TAC-734G Canister and Aerosol.png',
  'TAC-735R': 'TAC-735R 22L and Aerosol.png',
  'TAC-738R': 'TAC-738R 22L and Aerosol.png',
  'TAC-739R': 'TAC-739R 22L and Aerosol.png',
  'TAC-OS74': 'TAC-OS74 Sausage.png',
  'TAC-OS75': 'TAC-OS75 Cartridge.png',
  'TAC-R750': 'TAC-R750 2 Part.png',
  'TAC-R777': 'TAC-R777 Drum.png',
  'TAC-850GR': 'TAC850GR 22L.png',
  
  // Industrial
  '81-0389': '81-0389 5 gal pail.png',
  'C130': 'C130 Drum.png',
  'C150': 'C150 1 gal pail.png',
  'C331': 'C331 5 gal Pail.png',
  'CA1000': 'CA1000 Container.png',
  'CA1500': 'CA1500 Container.png',
  'CA2400': 'CA2400 Container.png',
  'FRP': 'FRP 3.5 gal pail.png',
  'IC932': 'IC932 Canister.png',
  'IC933': 'IC933 Canister and Aerosol.png',
  'IC934': 'IC934 Canister and Aerosol.png',
  'IC946': 'IC946 Canister and Aerosol.png',
  'IC947': 'IC947 Canister.png',
  'OA12': 'OA12 Cartridge.png',
  'OA13': 'OA13 Cartridge.png',
  'OA23': 'OA23 Sausage.png',
  'OA4': 'OA4 Cartridge.png',
  'OS10': 'OS10 Cartridge.png',
  'OS2': 'OS2 Cartridge.png',
  'OS20': 'OS20 Sausage.png',
  'OS24': 'OS24 Cartridge.png',
  'OS25': 'OS25 Cartridge.png',
  'OS31': 'OS31 Cartridge.png',
  'OS35': 'OS35 Cartridge.png',
  'OS37': 'OS37 Cartridge.png',
  'OS61': 'OS61 Cartridge.png',
  'OSA': 'OSA tin can.png',
  'R160': 'R160 2 part.png',
  'R221': 'R221 2 part.png',
  'R519': 'R519 2 part.png',
  'S228': 'S228 1 gal pail.png',
  
  // Tapes
  'T305': 'T305- Foam Tape.png',
  'T350': 'T350- Thermal Break Tape.png',
  'T600': 'T600 Foam Gasketing Tape.png',
  'T900': 'T900 Butyl Tape.png',
  'T950': 'T950 FSK Bonding Tape.png',
  'T970': 'T970 Foil Bonding Tape.png',
};

const VERCEL_BLOB_BASE_URL = 'https://jw4to4yw6mmciodr.public.blob.vercel-storage.com';

// Industry folder mapping
const INDUSTRY_FOLDER_MAP: Record<string, string> = {
  'composites_industry': 'Composites',
  'industrial_industry': 'Industrial',
  'insulation_industry': 'Insulation',
  'marine_industry': 'Marine',
  'transportation_industry': 'Transportation',
  'construction_industry': 'Construction',
  'tape_industry': 'Tape',
};

interface Product {
  product_id: string;
  image?: string;
  industry?: string;
  [key: string]: any;
}

class ProductImageNameUpdater {
  private jsonFilePath: string;
  private updatedCount: number = 0;
  private dbUpdatedCount: number = 0;
  private productModel: ProductModel | null = null;

  constructor() {
    this.jsonFilePath = path.join(__dirname, '../../data/forza_products_organized.json');
  }

  /**
   * Recursively find and update products in the JSON structure
   */
  private updateProductsInObject(obj: any): void {
    if (Array.isArray(obj)) {
      obj.forEach(item => this.updateProductsInObject(item));
    } else if (obj && typeof obj === 'object') {
      // Check if this is a product object
      if (obj.product_id && obj.image) {
        this.updateProductImage(obj);
      }
      
      // Recursively process all properties
      Object.keys(obj).forEach(key => {
        this.updateProductsInObject(obj[key]);
      });
    }
  }

  /**
   * Update a single product's image URL
   */
  private updateProductImage(product: Product): void {
    const productId = product.product_id;
    const newFilename = PRODUCT_IMAGE_MAPPING[productId];
    
    if (!newFilename) {
      return; // No mapping found for this product
    }

    // Get industry folder
    const industry = product.industry || '';
    const industryFolder = INDUSTRY_FOLDER_MAP[industry] || 'Industrial';
    
    // Construct new image URL
    const newImageUrl = `${VERCEL_BLOB_BASE_URL}/product-images/${industryFolder}/${newFilename}`;
    
    // Always update to ensure it matches the exact filename
    const oldImageUrl = product.image || '(no image)';
    
    // Force update - always set to the correct URL
    product.image = newImageUrl;
    this.updatedCount++;
    
    if (oldImageUrl !== newImageUrl) {
      console.log(`✅ Updating ${productId} in JSON:`);
      console.log(`   Old: ${oldImageUrl}`);
      console.log(`   New: ${newImageUrl}`);
    } else {
      console.log(`✓ ${productId} - JSON already correct, ensuring consistency`);
    }
  }

  /**
   * Update database with new image URLs
   */
  private async updateDatabaseImage(productId: string, newImageUrl: string): Promise<void> {
    if (!this.productModel) return;

    try {
      const product = await this.productModel.getProductById(productId);
      if (product) {
        const oldUrl = product.image || '(no image)';
        if (product.image !== newImageUrl) {
          await this.productModel.updateProduct(product.id, {
            image: newImageUrl
          });
          this.dbUpdatedCount++;
          console.log(`   💾 Database: ${productId}`);
          console.log(`      Old: ${oldUrl}`);
          console.log(`      New: ${newImageUrl}`);
        } else {
          console.log(`   ✓ Database: ${productId} already has correct URL`);
        }
      } else {
        console.log(`   ⚠️  Product ${productId} not found in database`);
      }
    } catch (error) {
      console.error(`   ❌ Error updating database for ${productId}:`, error);
    }
  }

  /**
   * Main update function
   */
  async updateImageNames(updateDatabase: boolean = true): Promise<void> {
    try {
      console.log('🖼️  Starting product image name update...');
      console.log(`📁 Reading JSON file: ${this.jsonFilePath}`);
      
      // Connect to database if needed
      if (updateDatabase) {
        console.log('🔌 Connecting to database...');
        const isHeroku = !!process.env.DATABASE_URL && process.env.DATABASE_URL.includes('amazonaws.com');
        if (isHeroku) {
          console.log('🌐 Detected Heroku/Production database');
        }
        await databaseService.connect();
        await databaseService.initializeDatabase();
        this.productModel = databaseService.isPostgres()
          ? new ProductModel()
          : new ProductModel(databaseService.getDatabase());
        console.log('✅ Database connected');
      }
      
      // Read JSON file
      const jsonContent = fs.readFileSync(this.jsonFilePath, 'utf-8');
      const data = JSON.parse(jsonContent);
      
      // Collect all products that need updating (always update products in mapping)
      const productsToUpdate: Array<{productId: string, newUrl: string, industry: string}> = [];
      
      // First pass: collect all products in the mapping
      const collectProducts = (obj: any): void => {
        if (Array.isArray(obj)) {
          obj.forEach(item => collectProducts(item));
        } else if (obj && typeof obj === 'object') {
          if (obj.product_id) {
            const productId = obj.product_id;
            const newFilename = PRODUCT_IMAGE_MAPPING[productId];
            
            if (newFilename) {
              const industry = obj.industry || '';
              const industryFolder = INDUSTRY_FOLDER_MAP[industry] || 'Industrial';
              const newImageUrl = `${VERCEL_BLOB_BASE_URL}/product-images/${industryFolder}/${newFilename}`;
              
              productsToUpdate.push({ productId, newUrl: newImageUrl, industry });
            }
          }
          
          Object.keys(obj).forEach(key => {
            collectProducts(obj[key]);
          });
        }
      };
      
      collectProducts(data);
      
      console.log(`\n📊 Found ${productsToUpdate.length} products in mapping to update`);
      
      // Update JSON file
      this.updateProductsInObject(data);
      
      // Update database - always update all products in mapping
      if (updateDatabase && productsToUpdate.length > 0) {
        console.log('\n💾 Updating database...');
        for (const { productId, newUrl } of productsToUpdate) {
          await this.updateDatabaseImage(productId, newUrl);
        }
      }
      
      // Write updated JSON back to file
      console.log(`\n💾 Writing updated JSON to file...`);
      fs.writeFileSync(
        this.jsonFilePath,
        JSON.stringify(data, null, 2),
        'utf-8'
      );
      
      console.log(`\n✅ Update completed!`);
      console.log(`📊 Updated ${this.updatedCount} product image URLs in JSON`);
      if (updateDatabase) {
        console.log(`📊 Updated ${this.dbUpdatedCount} product image URLs in database`);
      }
      
    } catch (error) {
      console.error('❌ Error updating product image names:', error);
      throw error;
    } finally {
      if (updateDatabase && databaseService.isPostgres()) {
        const pool = (databaseService as any).pool;
        if (pool) await pool.end();
      }
    }
  }
}

// Run the updater
if (require.main === module) {
  const updater = new ProductImageNameUpdater();
  updater.updateImageNames()
    .then(() => {
      console.log('🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { ProductImageNameUpdater };

