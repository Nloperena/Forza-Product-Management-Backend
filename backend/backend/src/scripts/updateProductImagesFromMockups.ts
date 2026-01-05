import { ProductModel } from '../models/Product';
import { databaseService } from '../services/database';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script to update product images from Product-Mockups folders
 * Based on BACKEND_AI_PROMPT.md and BACKEND_PRODUCT_IMAGES_CONTEXT.md
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
    
    if (databaseService.isPostgres()) {
      this.productModel = new ProductModel();
    } else {
      this.productModel = new ProductModel(databaseService.getDatabase());
    }
  }

  /**
   * Extract product ID from filename
   * Format: {ProductID} {PackageInfo}.png
   * Returns everything before the first space
   */
  private extractProductId(filename: string): string {
    // Remove .png extension
    const withoutExt = filename.replace(/\.png$/i, '');
    // Get part before first space
    const parts = withoutExt.split(' ');
    return parts[0].trim();
  }

  /**
   * Normalize product ID for case-insensitive matching
   */
  private normalizeProductId(productId: string): string {
    return productId.toUpperCase().trim();
  }

  /**
   * Scan a single industry folder for images
   */
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

  /**
   * Match images to products in database
   */
  private async matchImagesToProducts(images: ImageMatch[]): Promise<void> {
    console.log(`\n🔍 Matching ${images.length} images to database products...`);

    // Get all products from database
    const allProducts = await this.productModel.getAllProducts();

    for (const image of images) {
      const normalizedId = this.normalizeProductId(image.productId);

      // Find matching products (case-insensitive)
      const matchingProducts = allProducts.filter(p => 
        this.normalizeProductId(p.product_id) === normalizedId
      );

      if (matchingProducts.length === 0) {
        image.error = 'Product not found in database';
        continue;
      }

      // If multiple matches, prefer the one with matching industry
      let matchedProduct = matchingProducts.find(p => 
        p.industry === image.industry
      );

      // If no industry match, use first match
      if (!matchedProduct) {
        matchedProduct = matchingProducts[0];
        image.error = `Industry mismatch: product has ${matchedProduct.industry}, expected ${image.industry}`;
      }

      image.matched = true;
      image.productName = matchedProduct.name;
      image.currentImage = matchedProduct.image || 'No image';
    }
  }

  /**
   * Update product images in database
   */
  private async updateProductImages(images: ImageMatch[]): Promise<number> {
    const matchedImages = images.filter(img => img.matched && !img.error);
    console.log(`\n💾 Updating ${matchedImages.length} products in database...`);

    let updatedCount = 0;

    for (const image of matchedImages) {
      try {
        // Find product again to get its ID
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

  /**
   * Generate report
   */
  private generateReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 UPDATE REPORT');
    console.log('='.repeat(80));

    const matched = this.results.filter(r => r.matched && !r.error);
    const unmatched = this.results.filter(r => !r.matched);
    const errors = this.results.filter(r => r.error);

    console.log(`\n✅ Matched and ready to update: ${matched.length}`);
    matched.forEach(img => {
      console.log(`   ${img.productId} (${img.industry})`);
      console.log(`      Current: ${img.currentImage}`);
      console.log(`      New:     ${img.imagePath}`);
    });

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

    // Summary by industry
    console.log('\n📈 Summary by Industry:');
    for (const industry of INDUSTRY_MAPPINGS) {
      const industryImages = this.results.filter(r => r.industry === industry.dbValue);
      const industryMatched = industryImages.filter(r => r.matched && !r.error);
      console.log(`   ${industry.folderName}: ${industryMatched.length}/${industryImages.length} matched`);
    }
  }

  /**
   * Main execution method
   */
  async execute(): Promise<void> {
    console.log('🖼️  Product Image Updater');
    console.log('='.repeat(80));
    console.log(`Mode: ${this.dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE UPDATE'}`);
    console.log(`Mockups path: ${this.mockupsBasePath}`);
    console.log('='.repeat(80));

    // Check if base path exists
    if (!fs.existsSync(this.mockupsBasePath)) {
      throw new Error(`Product-Mockups folder not found at: ${this.mockupsBasePath}`);
    }

    // Scan all industry folders
    const allImages: ImageMatch[] = [];

    for (const industry of INDUSTRY_MAPPINGS) {
      const folderPath = path.join(this.mockupsBasePath, industry.folderName);
      const images = this.scanIndustryFolder(folderPath, industry);
      allImages.push(...images);
    }

    console.log(`\n📦 Total images found: ${allImages.length}`);

    // Match to products
    await this.matchImagesToProducts(allImages);
    this.results = allImages;

    // Update products
    const updatedCount = await this.updateProductImages(allImages);

    // Generate report
    this.generateReport();

    console.log(`\n${this.dryRun ? '🔍 DRY RUN COMPLETE' : '✅ UPDATE COMPLETE'}`);
    console.log(`   Images processed: ${allImages.length}`);
    console.log(`   Products updated: ${updatedCount}`);
    
    if (this.dryRun) {
      console.log('\n💡 To apply changes, run with --live flag');
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--live');
  
  // Default path - correct location per PATH_CLARIFICATION.md
  // Try multiple possible locations
  const possiblePaths = [
    'C:\\Users\\nimro\\Downloads\\01_Projects\\BusinessProjects\\Forza\\ForzaBuilt\\WebsiteRebuild2\\ForzaBuilt.com\\public\\images\\Product-Mockups',
    path.join(__dirname, '../../../frontend-only/public/images/Product-Mockups'),
    path.join(__dirname, '../../../../WebsiteRebuild2/ForzaBuilt.com/public/images/Product-Mockups'),
    path.join(__dirname, '../../../../ForzaBuilt/WebsiteRebuild2/ForzaBuilt.com/public/images/Product-Mockups'),
  ];

  let mockupsPath = possiblePaths.find(p => fs.existsSync(p));

  // Allow override via command line
  const pathArg = args.find(arg => arg.startsWith('--path='));
  if (pathArg) {
    mockupsPath = pathArg.split('=')[1];
  }

  if (!mockupsPath) {
    console.error('❌ Product-Mockups folder not found. Tried:');
    possiblePaths.forEach(p => console.error(`   ${p}`));
    console.error('\n💡 Specify path with: --path=/path/to/Product-Mockups');
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

