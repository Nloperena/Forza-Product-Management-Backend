import { list } from '@vercel/blob';
import * as dotenv from 'dotenv';

dotenv.config();

// Vercel Blob base URL
const VERCEL_BLOB_BASE_URL = 'https://jw4to4yw6mmciodr.public.blob.vercel-storage.com';

// Industry folders to check
const INDUSTRY_FOLDERS = [
  'Composites',
  'Construction',
  'Industrial',
  'Insulation',
  'Marine',
  'Transportation'
];

interface BlobFile {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
}

class VercelBlobMediaLister {
  private token: string;

  constructor() {
    this.token = process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_TOKEN || '';
    
    if (!this.token) {
      throw new Error('BLOB_READ_WRITE_TOKEN or VERCEL_BLOB_TOKEN environment variable is required');
    }
  }

  async listAllMedia(): Promise<void> {
    console.log('📂 Listing all media files in Vercel Blob storage...\n');
    console.log(`Base URL: ${VERCEL_BLOB_BASE_URL}\n`);
    console.log('='.repeat(80));

    let totalFiles = 0;
    let totalSize = 0;
    const allFiles: { [folder: string]: BlobFile[] } = {};

    for (const folder of INDUSTRY_FOLDERS) {
      try {
        console.log(`\n📁 Listing files in: ${folder}/`);
        console.log('-'.repeat(80));

        // List files with the prefix for this folder
        const prefix = `product-images/${folder}/`;
        const { blobs } = await list({
          prefix,
          token: this.token,
        });

        const folderFiles: BlobFile[] = blobs.map(blob => ({
          url: blob.url,
          pathname: blob.pathname,
          size: blob.size,
          uploadedAt: blob.uploadedAt
        }));

        allFiles[folder] = folderFiles;
        totalFiles += folderFiles.length;
        
        const folderSize = folderFiles.reduce((sum, file) => sum + file.size, 0);
        totalSize += folderSize;

        console.log(`✅ Found ${folderFiles.length} file(s) (${this.formatSize(folderSize)})`);

        // Print each file
        if (folderFiles.length > 0) {
          folderFiles.forEach((file, index) => {
            const filename = file.pathname.split('/').pop() || file.pathname;
            console.log(`   ${index + 1}. ${filename}`);
            console.log(`      URL: ${file.url}`);
            console.log(`      Size: ${this.formatSize(file.size)}`);
            console.log(`      Uploaded: ${file.uploadedAt.toLocaleString()}`);
          });
        } else {
          console.log('   (No files found)');
        }

      } catch (error: any) {
        console.error(`❌ Error listing files in ${folder}/:`, error.message);
        allFiles[folder] = [];
      }
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total folders checked: ${INDUSTRY_FOLDERS.length}`);
    console.log(`Total files found: ${totalFiles}`);
    console.log(`Total size: ${this.formatSize(totalSize)}`);
    console.log('\n📁 Files by folder:');
    
    INDUSTRY_FOLDERS.forEach(folder => {
      const count = allFiles[folder]?.length || 0;
      const size = allFiles[folder]?.reduce((sum, file) => sum + file.size, 0) || 0;
      console.log(`   ${folder}: ${count} file(s) - ${this.formatSize(size)}`);
    });

    // Generate a detailed report
    console.log('\n' + '='.repeat(80));
    console.log('📋 DETAILED FILE LIST');
    console.log('='.repeat(80));
    
    INDUSTRY_FOLDERS.forEach(folder => {
      const files = allFiles[folder] || [];
      if (files.length > 0) {
        console.log(`\n📁 ${folder}/ (${files.length} file(s)):`);
        files.forEach((file, index) => {
          const filename = file.pathname.split('/').pop() || file.pathname;
          console.log(`   ${index + 1}. ${filename}`);
          console.log(`      ${file.url}`);
        });
      }
    });

    // Export as JSON
    console.log('\n' + '='.repeat(80));
    console.log('💾 Exporting to JSON format...');
    
    const exportData = {
      baseUrl: VERCEL_BLOB_BASE_URL,
      generatedAt: new Date().toISOString(),
      summary: {
        totalFolders: INDUSTRY_FOLDERS.length,
        totalFiles,
        totalSize,
        totalSizeBytes: totalSize
      },
      folders: INDUSTRY_FOLDERS.map(folder => ({
        name: folder,
        fileCount: allFiles[folder]?.length || 0,
        totalSize: allFiles[folder]?.reduce((sum, file) => sum + file.size, 0) || 0,
        files: allFiles[folder]?.map(file => ({
          filename: file.pathname.split('/').pop() || file.pathname,
          url: file.url,
          pathname: file.pathname,
          size: file.size,
          sizeFormatted: this.formatSize(file.size),
          uploadedAt: file.uploadedAt.toISOString()
        })) || []
      }))
    };

    console.log('\n📄 JSON Export:');
    console.log(JSON.stringify(exportData, null, 2));
  }

  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

async function main() {
  try {
    const lister = new VercelBlobMediaLister();
    await lister.listAllMedia();
  } catch (error: any) {
    console.error('❌ Failed to list Vercel Blob media:', error.message);
    if (error.message.includes('BLOB_READ_WRITE_TOKEN')) {
      console.log('\n💡 Make sure to set BLOB_READ_WRITE_TOKEN or VERCEL_BLOB_TOKEN in your .env file');
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { VercelBlobMediaLister };

