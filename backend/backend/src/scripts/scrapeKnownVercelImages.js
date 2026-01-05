const axios = require('axios');
const fs = require('fs');
const path = require('path');

class KnownVercelImageScraper {
  constructor() {
    this.scrapedDir = path.join(__dirname, '../../public/scraped-products-full');
    this.downloadedImages = [];
    this.failedDownloads = [];
    
    // List of known Vercel Blob URLs from our verification report
    this.knownImageUrls = [
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/frp.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/c-t731.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/c-t564.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/c-t5100.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/c-t500.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/r-t860.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/r-t620.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/r-t600.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/t-t430.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/t-t420.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/t-t415.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/t-t1420.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/t-r785.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/t-r679.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/c-t550.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/c-t553.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/c-t557.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/t220.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/t215.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/m-t820.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/m-t815.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/t500.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/t464.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/t305.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/c-r560.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/c-r552.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/c-r329.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/c-osa.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/c-os9.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/c-os55.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/c-oa98.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/c-oa52.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/c-oa5.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/r-os84.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/r-os8.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/tac-os75.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/t-s596.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/t-osa155.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/t-os164.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/t-os151.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/t-oa177.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/t-oa156.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/t-oa152.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/m-osa783.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/m-os796.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/m-os789.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/m-os764.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/m-oa755.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/osa.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/os61.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/os55.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/os37.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/os35.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/os25.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/os24.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/os20.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/os16.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/os10.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/os2.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/oa23.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/oa13.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/oa12.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/oa4.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/cc519.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/cc515.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/cc513.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/cc507.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/cc503.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/cc501.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/c-w6106.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/c-c551.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/c-c360.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/rc887.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/rc886.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/rc864.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/rc863.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/rc862.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/rc826.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/r-r820.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/r-c661.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/r-21000.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/r-a2000.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/tac850tn.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/tac850gr.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/tac850.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/tac-739r.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/tac-738r.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/tac-735.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/tac-734g.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/tc467.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/tc466.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/tc456.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/tc454.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/tc453.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/tc452.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/t-c485.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/t-c225.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/t-c222.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/mc741.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/mc739.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/mc737.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/mc724.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/mc723.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/mc722.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/m-r478.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/m-r445.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/m-r420.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/m-c285.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/m-c283.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/m-c280.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/w700.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/r519.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/r221.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/r190.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/r160.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/ic947.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/ic946.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/ic934.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/ic933.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/ic932.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/ca2400.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/ca1500.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/c331.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/c130.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/ca1000.png',
      'https://rifer2chtzhht7fs.public.blob.vercel-storage.com/81-0389.png'
    ];
  }

  async createDirectory() {
    try {
      if (!fs.existsSync(this.scrapedDir)) {
        fs.mkdirSync(this.scrapedDir, { recursive: true });
        console.log(`📁 Created directory: ${this.scrapedDir}`);
      } else {
        console.log(`📁 Directory already exists: ${this.scrapedDir}`);
      }
    } catch (error) {
      console.error('❌ Error creating directory:', error);
      throw error;
    }
  }

  async downloadImage(imageUrl, filename) {
    try {
      console.log(`   📥 Downloading: ${filename}`);
      
      const response = await axios.get(imageUrl, {
        responseType: 'stream',
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const filePath = path.join(this.scrapedDir, filename);
      const writer = fs.createWriteStream(filePath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`   ✅ Downloaded: ${filename}`);
          resolve(filePath);
        });
        writer.on('error', (error) => {
          console.log(`   ❌ Error writing file ${filename}:`, error.message);
          reject(error);
        });
      });

    } catch (error) {
      console.log(`   ❌ Failed to download ${filename}:`, error.message);
      throw error;
    }
  }

  async checkImageExists(imageUrl) {
    try {
      const response = await axios.head(imageUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async scrapeAllImages() {
    try {
      console.log('🚀 Starting Vercel Blob image scraping...');
      
      // Create directory
      await this.createDirectory();
      
      console.log(`📊 Found ${this.knownImageUrls.length} known Vercel Blob image URLs`);
      
      // Process each URL
      for (let i = 0; i < this.knownImageUrls.length; i++) {
        const imageUrl = this.knownImageUrls[i];
        const filename = imageUrl.split('/').pop();
        
        console.log(`\n🔍 Processing ${i + 1}/${this.knownImageUrls.length}: ${filename}`);
        console.log(`   URL: ${imageUrl}`);
        
        try {
          // Check if image exists
          const exists = await this.checkImageExists(imageUrl);
          if (!exists) {
            console.log(`   ❌ Image not found or inaccessible`);
            this.failedDownloads.push({
              imageUrl: imageUrl,
              filename: filename,
              reason: 'Image not found or inaccessible'
            });
            continue;
          }
          
          // Download the image
          await this.downloadImage(imageUrl, filename);
          
          this.downloadedImages.push({
            imageUrl: imageUrl,
            filename: filename,
            localPath: path.join(this.scrapedDir, filename)
          });
          
          // Add a small delay to be respectful to the server
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.log(`   ❌ Error processing ${filename}:`, error.message);
          this.failedDownloads.push({
            imageUrl: imageUrl,
            filename: filename,
            reason: error.message
          });
        }
      }
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Error during scraping:', error);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📋 VERCEL BLOB IMAGE SCRAPING REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n✅ SUCCESSFULLY DOWNLOADED: ${this.downloadedImages.length}`);
    this.downloadedImages.forEach(item => {
      console.log(`   ${item.filename}`);
    });
    
    console.log(`\n❌ FAILED DOWNLOADS: ${this.failedDownloads.length}`);
    this.failedDownloads.forEach(item => {
      console.log(`   ${item.filename}: ${item.reason}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY:');
    console.log(`Total URLs processed: ${this.knownImageUrls.length}`);
    console.log(`Successfully downloaded: ${this.downloadedImages.length}`);
    console.log(`Failed downloads: ${this.failedDownloads.length}`);
    console.log(`Success rate: ${((this.downloadedImages.length / this.knownImageUrls.length) * 100).toFixed(2)}%`);
    console.log(`Images saved to: ${this.scrapedDir}`);
    console.log('='.repeat(80));
    
    // Save detailed report to file
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalUrls: this.knownImageUrls.length,
        successfulDownloads: this.downloadedImages.length,
        failedDownloads: this.failedDownloads.length,
        successRate: `${((this.downloadedImages.length / this.knownImageUrls.length) * 100).toFixed(2)}%`
      },
      downloadedImages: this.downloadedImages,
      failedDownloads: this.failedDownloads,
      scrapedDirectory: this.scrapedDir
    };
    
    const reportPath = path.join(__dirname, '../../known-vercel-scraping-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }
}

// Run the scraper
const scraper = new KnownVercelImageScraper();
scraper.scrapeAllImages();



