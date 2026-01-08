import * as fs from 'fs';
import * as path from 'path';
import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';

// Mapping of product_id to expected image filename
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

const INDUSTRY_FOLDER_MAP: Record<string, string> = {
  'composites_industry': 'Composites',
  'industrial_industry': 'Industrial',
  'insulation_industry': 'Insulation',
  'marine_industry': 'Marine',
  'transportation_industry': 'Transportation',
  'construction_industry': 'Construction',
  'tape_industry': 'Tape',
};

interface VerificationResult {
  productId: string;
  expectedUrl: string;
  jsonUrl: string | null;
  dbUrl: string | null;
  jsonMatch: boolean;
  dbMatch: boolean;
}

class ImageUrlVerifier {
  private jsonFilePath: string;
  private results: VerificationResult[] = [];

  constructor() {
    this.jsonFilePath = path.join(__dirname, '../../data/forza_products_organized.json');
  }

  private findProductInJSON(productId: string, obj: any): any {
    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (item.product_id === productId) {
          return item;
        }
        const found = this.findProductInJSON(productId, item);
        if (found) return found;
      }
    } else if (obj && typeof obj === 'object') {
      if (obj.product_id === productId) {
        return obj;
      }
      for (const key in obj) {
        const found = this.findProductInJSON(productId, obj[key]);
        if (found) return found;
      }
    }
    return null;
  }

  async verify(): Promise<void> {
    console.log('🔍 Verifying product image URLs...\n');

    // Load JSON
    const jsonContent = fs.readFileSync(this.jsonFilePath, 'utf-8');
    const jsonData = JSON.parse(jsonContent);

    // Connect to database
    await databaseService.connect();
    await databaseService.initializeDatabase();
    const productModel = databaseService.isPostgres()
      ? new ProductModel()
      : new ProductModel(databaseService.getDatabase());

    // Verify each product
    for (const [productId, expectedFilename] of Object.entries(PRODUCT_IMAGE_MAPPING)) {
      // Find product in JSON
      const jsonProduct = this.findProductInJSON(productId, jsonData);
      const jsonUrl = jsonProduct?.image || null;

      // Get expected URL
      const industry = jsonProduct?.industry || 'industrial_industry';
      const industryFolder = INDUSTRY_FOLDER_MAP[industry] || 'Industrial';
      const expectedUrl = `${VERCEL_BLOB_BASE_URL}/product-images/${industryFolder}/${expectedFilename}`;

      // Get from database
      let dbUrl: string | null = null;
      try {
        const dbProduct = await productModel.getProductById(productId);
        dbUrl = dbProduct?.image || null;
      } catch (error) {
        // Product might not exist in DB
      }

      const result: VerificationResult = {
        productId,
        expectedUrl,
        jsonUrl,
        dbUrl,
        jsonMatch: jsonUrl === expectedUrl,
        dbMatch: dbUrl === expectedUrl,
      };

      this.results.push(result);
    }

    // Print results
    console.log('='.repeat(100));
    console.log('VERIFICATION RESULTS');
    console.log('='.repeat(100));
    console.log();

    let jsonMismatches = 0;
    let dbMismatches = 0;

    for (const result of this.results) {
      if (!result.jsonMatch || !result.dbMatch) {
        console.log(`❌ ${result.productId}:`);
        if (!result.jsonMatch) {
          console.log(`   JSON: Expected "${result.expectedUrl}"`);
          console.log(`         Got      "${result.jsonUrl}"`);
          jsonMismatches++;
        }
        if (!result.dbMatch) {
          console.log(`   DB:   Expected "${result.expectedUrl}"`);
          console.log(`         Got      "${result.dbUrl}"`);
          dbMismatches++;
        }
        console.log();
      }
    }

    if (jsonMismatches === 0 && dbMismatches === 0) {
      console.log('✅ All product image URLs are correct!');
    } else {
      console.log(`\n📊 Summary:`);
      console.log(`   JSON mismatches: ${jsonMismatches}`);
      console.log(`   Database mismatches: ${dbMismatches}`);
    }

    // Cleanup
    if (databaseService.isPostgres()) {
      const pool = (databaseService as any).pool;
      if (pool) await pool.end();
    }
  }
}

// Run verification
if (require.main === module) {
  const verifier = new ImageUrlVerifier();
  verifier.verify()
    .then(() => {
      console.log('\n🎉 Verification completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Verification failed:', error);
      process.exit(1);
    });
}

export { ImageUrlVerifier };

