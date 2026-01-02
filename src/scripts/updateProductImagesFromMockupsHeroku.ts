import { ProductModel } from '../models/Product';
import { databaseService } from '../services/database';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script to update product images from Product-Mockups folders
 * Specifically for Heroku/PostgreSQL database
 * 
 * Usage: 
 *   DATABASE_URL=your_heroku_db_url npx ts-node src/scripts/updateProductImagesFromMockupsHeroku.ts --live
 */

interface IndustryMapping {
  folderName: string;
  dbValue: string;
}

const INDUSTRY_MAPPINGS: IndustryMapping[] = [
  { folderName: 'Transportation', dbValue: 'transportation_industry' },
  { folderName: 'Marine', dbValue: 'marine_industry' },
  { folderName: 'Industrial', dbValue: 'industrial_industry' },
  { folderName: 'Construction', dbValue: 'construction_industry' },
  { folderName: 'Composites', dbValue: 'composites_industry' },
  { folderName: 'Insulation', dbValue: 'insulation_industry' },
];

interface ImageMatch {
  filename: string;
  productId: string;
  industry: string;
  imagePath: string;
  matched: boolean;
  productName?: string;
  currentImage?: string;
  error?: string;
}

class ProductImageUpdater {
  private productModel: ProductModel;
  private mockupsBasePath: string;
  private dryRun: boolean;
  private results: ImageMatch[] = [];

  constructor(mockupsPath: string, dryRun: boolean = true) {
    this.mockupsBasePath = mockupsPath;
    this.dryRun = dryRun;
    
    // For PostgreSQL, ProductModel handles connection internally
    this.productModel = new ProductModel();
  }

  private extractProductId(filename: string): string {
    const withoutExt = filename.replace(/\.png$/i, '');
    const parts = withoutExt.split(' ');
    return parts[0].trim();
  }

  private normalizeProductId(productId: string): string {
    return productId.toUpperCase().trim();
  }

  private scanIndustryFolder(folderPath: string, industry: IndustryMapping): ImageMatch[] {
    const matches: ImageMatch[] = [];

    if (!fs.existsSync(folderPath)) {
      console.log(`⚠️  Folder not found: ${folderPath}`);
      return matches;
    }

    const files = fs.readdirSync(folderPath);
    const pngFiles = files.filter(file => file.toLowerCase().endsWith('.png'));

    console.log(`\n📁 Scanning ${industry.folderName} folder: ${pngFiles.length} PNG files`);

    for (const filename of pngFiles) {
      const productId = this.extractProductId(filename);
      const imagePath = `/images/Product-Mockups/${industry.folderName}/${filename}`;

      matches.push({
        filename,
        productId,
        industry: industry.dbValue,
        imagePath,
        matched: false,
      });
    }

    return matches;
  }

  private async matchImagesToProducts(images: ImageMatch[]): Promise<void> {
    console.log(`\n🔍 Matching ${images.length} images to database products...`);

    const allProducts = await this.productModel.getAllProducts();

    for (const image of images) {
      const normalizedId = this.normalizeProductId(image.productId);

      const matchingProducts = allProducts.filter(p => 
        this.normalizeProductId(p.product_id) === normalizedId
      );

      if (matchingProducts.length === 0) {
        image.error = 'Product not found in database';
        continue;
      }

      let matchedProduct = matchingProducts.find(p => 
        p.industry === image.industry
      );

      if (!matchedProduct) {
        matchedProduct = matchingProducts[0];
        image.error = `Industry mismatch: product has ${matchedProduct.industry}, expected ${image.industry}`;
      }

      image.matched = true;
      image.productName = matchedProduct.name;
      image.currentImage = matchedProduct.image || 'No image';
    }
  }

  private async updateProductImages(images: ImageMatch[]): Promise<number> {
    const matchedImages = images.filter(img => img.matched && !img.error);
    console.log(`\n💾 Updating ${matchedImages.length} products in database...`);

    let updatedCount = 0;

    for (const image of matchedImages) {
      try {
        const allProducts = await this.productModel.getAllProducts();
        const normalizedId = this.normalizeProductId(image.productId);
        
        const product = allProducts.find(p => 
          this.normalizeProductId(p.product_id) === normalizedId &&
          p.industry === image.industry
        );

        if (!product) {
          image.error = 'Product not found during update';
          continue;
        }

        if (!this.dryRun) {
          await this.productModel.updateProduct(product.id, {
            image: image.imagePath,
          });
        }

        updatedCount++;
        console.log(`  ${this.dryRun ? '[DRY RUN] ' : ''}✅ ${image.productId} -> ${image.imagePath}`);

      } catch (error) {
        image.error = error instanceof Error ? error.message : 'Unknown error';
        console.error(`  ❌ Error updating ${image.productId}:`, error);
      }
    }

    return updatedCount;
  }

  private generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 UPDATE REPORT');
    console.log('='.repeat(80));

    const matched = this.results.filter(r => r.matched && !r.error);
    const unmatched = this.results.filter(r => !r.matched);
    const errors = this.results.filter(r => r.error);

    console.log(`\n✅ Matched and ready to update: ${matched.length}`);
    
    if (unmatched.length > 0) {
      console.log(`\n⚠️  Unmatched images: ${unmatched.length}`);
      unmatched.forEach(img => {
        console.log(`   ${img.filename} -> Product ID: ${img.productId}`);
      });
    }

    if (errors.length > 0) {
      console.log(`\n❌ Errors: ${errors.length}`);
      errors.forEach(img => {
        console.log(`   ${img.productId}: ${img.error}`);
      });
    }

    console.log('\n📈 Summary by Industry:');
    for (const industry of INDUSTRY_MAPPINGS) {
      const industryImages = this.results.filter(r => r.industry === industry.dbValue);
      const industryMatched = industryImages.filter(r => r.matched && !r.error);
      console.log(`   ${industry.folderName}: ${industryMatched.length}/${industryImages.length} matched`);
    }
  }

  async execute(): Promise<void> {
    console.log('🖼️  Product Image Updater (Heroku/PostgreSQL)');
    console.log('='.repeat(80));
    console.log(`Mode: ${this.dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE UPDATE'}`);
    console.log(`Mockups path: ${this.mockupsBasePath}`);
    console.log(`Database: ${databaseService.isPostgres() ? 'PostgreSQL' : 'SQLite'}`);
    console.log('='.repeat(80));

    if (!databaseService.isPostgres()) {
      console.error('❌ This script is designed for PostgreSQL/Heroku database.');
      console.error('   Set DATABASE_URL environment variable to use PostgreSQL.');
      throw new Error('PostgreSQL database required');
    }

    if (!fs.existsSync(this.mockupsBasePath)) {
      throw new Error(`Product-Mockups folder not found at: ${this.mockupsBasePath}`);
    }

    const allImages: ImageMatch[] = [];

    for (const industry of INDUSTRY_MAPPINGS) {
      const folderPath = path.join(this.mockupsBasePath, industry.folderName);
      const images = this.scanIndustryFolder(folderPath, industry);
      allImages.push(...images);
    }

    console.log(`\n📦 Total images found: ${allImages.length}`);

    await this.matchImagesToProducts(allImages);
    this.results = allImages;

    const updatedCount = await this.updateProductImages(allImages);

    this.generateReport();

    console.log(`\n${this.dryRun ? '🔍 DRY RUN COMPLETE' : '✅ UPDATE COMPLETE'}`);
    console.log(`   Images processed: ${allImages.length}`);
    console.log(`   Products updated: ${updatedCount}`);
    
    if (this.dryRun) {
      console.log('\n💡 To apply changes, run with --live flag');
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--live');
  
  const possiblePaths = [
    'C:\\Users\\nimro\\Downloads\\01_Projects\\BusinessProjects\\Forza\\ForzaBuilt\\WebsiteRebuild2\\ForzaBuilt.com\\public\\images\\Product-Mockups',
    path.join(__dirname, '../../../frontend-only/public/images/Product-Mockups'),
  ];

  let mockupsPath = possiblePaths.find(p => fs.existsSync(p));

  const pathArg = args.find(arg => arg.startsWith('--path='));
  if (pathArg) {
    mockupsPath = pathArg.split('=')[1];
  }

  if (!mockupsPath) {
    console.error('❌ Product-Mockups folder not found.');
    process.exit(1);
  }

  try {
    await databaseService.connect();
    await databaseService.initializeDatabase();

    const updater = new ProductImageUpdater(mockupsPath, dryRun);
    await updater.execute();

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { ProductImageUpdater };







