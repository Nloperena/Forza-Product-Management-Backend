import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const JSON_FILE_PATH = path.join(__dirname, '../../data/forza_products_organized.json');

// Vercel Blob base URL
const VERCEL_BLOB_BASE_URL = 'https://jw4to4yw6mmciodr.public.blob.vercel-storage.com';

interface MediaFile {
  url: string;
  filename: string;
  folder: string;
  productId: string;
  productName: string;
  source: 'database' | 'json';
}

class MediaLister {
  private productModel: ProductModel;
  private allMedia: Map<string, MediaFile> = new Map();

  constructor() {
    if (databaseService.isPostgres()) {
      this.productModel = new ProductModel();
    } else {
      this.productModel = new ProductModel(databaseService.getDatabase());
    }
  }

  private extractFolderFromUrl(url: string): string {
    if (!url.includes(VERCEL_BLOB_BASE_URL)) return 'Unknown';
    
    const match = url.match(/product-images\/([^/]+)\//);
    return match ? match[1] : 'Unknown';
  }

  private extractFilenameFromUrl(url: string): string {
    if (url.includes(VERCEL_BLOB_BASE_URL)) {
      const parts = url.split('/');
      return parts[parts.length - 1];
    }
    return url.split('/').pop() || url;
  }

  async listFromDatabase(): Promise<void> {
    console.log('📊 Extracting media from database...\n');
    
    const products = await this.productModel.getAllProducts();
    
    products.forEach(product => {
      if (product.image && product.image.includes(VERCEL_BLOB_BASE_URL)) {
        const key = product.image;
        if (!this.allMedia.has(key)) {
          this.allMedia.set(key, {
            url: product.image,
            filename: this.extractFilenameFromUrl(product.image),
            folder: this.extractFolderFromUrl(product.image),
            productId: product.product_id,
            productName: product.name,
            source: 'database'
          });
        }
      }
    });

    console.log(`✅ Found ${this.allMedia.size} unique media files in database\n`);
  }

  async listFromJSON(): Promise<void> {
    console.log('📄 Extracting media from JSON file...\n');
    
    if (!fs.existsSync(JSON_FILE_PATH)) {
      console.log('⚠️  JSON file not found, skipping...\n');
      return;
    }

    const jsonContent = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf-8'));
    let count = 0;

    const extractFromSection = (section: any, productId?: string, productName?: string): void => {
      if (Array.isArray(section)) {
        section.forEach((item: any) => {
          if (item.image && item.image.includes(VERCEL_BLOB_BASE_URL)) {
            const key = item.image;
            if (!this.allMedia.has(key)) {
              this.allMedia.set(key, {
                url: item.image,
                filename: this.extractFilenameFromUrl(item.image),
                folder: this.extractFolderFromUrl(item.image),
                productId: item.product_id || productId || 'Unknown',
                productName: item.name || productName || 'Unknown',
                source: 'json'
              });
              count++;
            }
          }
          if (item.product_id) {
            extractFromSection(item, item.product_id, item.name);
          }
        });
      } else if (typeof section === 'object' && section !== null) {
        Object.values(section).forEach((value: any) => {
          extractFromSection(value, productId, productName);
        });
      }
    };

    if (jsonContent.forza_products_organized) {
      extractFromSection(jsonContent.forza_products_organized);
    }

    console.log(`✅ Found ${count} additional media files in JSON\n`);
  }

  printReport(): void {
    console.log('='.repeat(80));
    console.log('📋 ALL MEDIA FILES IN VERCEL BLOB STORAGE');
    console.log('='.repeat(80));
    console.log(`Total unique media files: ${this.allMedia.size}\n`);

    // Group by folder
    const byFolder: { [folder: string]: MediaFile[] } = {};
    this.allMedia.forEach(file => {
      if (!byFolder[file.folder]) {
        byFolder[file.folder] = [];
      }
      byFolder[file.folder].push(file);
    });

    // Print by folder
    const folders = Object.keys(byFolder).sort();
    
    folders.forEach(folder => {
      const files = byFolder[folder];
      console.log(`\n📁 ${folder}/ (${files.length} file(s))`);
      console.log('-'.repeat(80));
      
      files.sort((a, b) => a.filename.localeCompare(b.filename));
      
      files.forEach((file, index) => {
        console.log(`\n${index + 1}. ${file.filename}`);
        console.log(`   URL: ${file.url}`);
        console.log(`   Product: ${file.productId} - ${file.productName}`);
        console.log(`   Source: ${file.source}`);
      });
    });

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY BY FOLDER');
    console.log('='.repeat(80));
    
    folders.forEach(folder => {
      console.log(`   ${folder}: ${byFolder[folder].length} file(s)`);
    });

    // Export as JSON
    console.log('\n' + '='.repeat(80));
    console.log('💾 JSON EXPORT');
    console.log('='.repeat(80));
    
    const exportData = {
      baseUrl: VERCEL_BLOB_BASE_URL,
      generatedAt: new Date().toISOString(),
      summary: {
        totalFiles: this.allMedia.size,
        folders: folders.length
      },
      folders: folders.map(folder => ({
        name: folder,
        fileCount: byFolder[folder].length,
        files: byFolder[folder].map(file => ({
          filename: file.filename,
          url: file.url,
          productId: file.productId,
          productName: file.productName,
          source: file.source
        }))
      }))
    };

    console.log(JSON.stringify(exportData, null, 2));
  }
}

async function main() {
  try {
    await databaseService.connect();
    await databaseService.initializeDatabase();

    const lister = new MediaLister();
    await lister.listFromDatabase();
    await lister.listFromJSON();
    lister.printReport();

    console.log('\n✅ Media listing completed!');
  } catch (error: any) {
    console.error('❌ Failed to list media:', error.message);
    process.exit(1);
  } finally {
    await databaseService.disconnect();
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

export { MediaLister };

