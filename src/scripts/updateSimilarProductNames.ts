import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const API_BASE_URL = 'https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com/api';
const BASE_URL = 'https://forzabuilt.com/product';
const JSON_FILE_PATH = path.join(__dirname, '../../data/forza_products_organized.json');

// Products to update with their expected base names
const PRODUCTS_TO_UPDATE: Record<string, string> = {
  'M-OA755': 'OA75 – Trowellable Flooring Adhesive', // M-OA755 should use OA75's description
  'C-OS55': 'OS55 – Butyl Adhesive Caulk', // C-OS55 should use OS55's description
  'C-T500': 'T500 – Butyl Adhesive Tape', // C-T500 should use T500's description
  'R-T600': 'T600 – Foam Gasketing Tape' // R-T600 should use T600's description
};

async function scrapeFullName(productId: string): Promise<string | null> {
  // First, try to find in JSON file
  try {
    const jsonContent = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
    const data = JSON.parse(jsonContent);
    
    function searchProducts(obj: any): any | null {
      if (Array.isArray(obj)) {
        for (const item of obj) {
          const found = searchProducts(item);
          if (found) return found;
        }
      } else if (obj !== null && typeof obj === 'object') {
        if (obj.product_id && obj.product_id.toUpperCase() === productId.toUpperCase()) {
          return obj;
        }
        for (const key in obj) {
          const found = searchProducts(obj[key]);
          if (found) return found;
        }
      }
      return null;
    }
    
    const jsonProduct = searchProducts(data);
    if (jsonProduct) {
      const name = jsonProduct.full_name || jsonProduct.name;
      if (name && name.includes('–')) {
        let fullName = name.trim();
        // Remove brand prefixes
        fullName = fullName
          .replace(/^ForzaBOND®\s*/i, '')
          .replace(/^ForzaSEAL®\s*/i, '')
          .replace(/^ForzaTAPE®\s*/i, '')
          .trim();
        
        // Ensure it starts with product ID
        if (!fullName.toUpperCase().startsWith(productId.toUpperCase())) {
          const idIndex = fullName.toUpperCase().indexOf(productId.toUpperCase());
          if (idIndex >= 0) {
            fullName = fullName.substring(idIndex).trim();
          } else {
            fullName = `${productId} – ${fullName}`;
          }
        }
        return fullName;
      }
    }
  } catch (error) {
    // Continue to scraping
  }

  // Try scraping from website
  try {
    const urlFormats = [
      `${BASE_URL}/${productId.toLowerCase()}/`,
      `${BASE_URL}/${productId}/`,
      `${BASE_URL}/${productId.replace(/-/g, '').toLowerCase()}/`
    ];

    let html: string | null = null;

    for (const url of urlFormats) {
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        html = response.data;
        break;
      } catch (error) {
        continue;
      }
    }

    if (!html) {
      return null;
    }

    const $ = cheerio.load(html);
    let fullName = '';

    // Try various methods to find product name
    const h1 = $('h1').first().text().trim();
    if (h1 && h1.includes(productId.toUpperCase())) {
      fullName = h1;
    }

    if (!fullName) {
      const productTitle = $('.product-title, .product-name, .entry-title').first().text().trim();
      if (productTitle && productTitle.includes(productId.toUpperCase())) {
        fullName = productTitle;
      }
    }

    if (!fullName) {
      const metaTitle = $('title').text().trim();
      if (metaTitle && metaTitle.includes(productId.toUpperCase())) {
        fullName = metaTitle.split('|')[0].trim();
      }
    }

    if (!fullName) {
      $('h1, h2, h3, .title, .name').each((_, el): boolean => {
        const text = $(el).text().trim();
        if (text.includes(productId.toUpperCase()) && text.length > productId.length + 5) {
          fullName = text;
          return false;
        }
        return true;
      });
    }

    if (fullName) {
      // Clean up
      fullName = fullName
        .replace(/^ForzaBOND®\s*/i, '')
        .replace(/^ForzaSEAL®\s*/i, '')
        .replace(/^ForzaTAPE®\s*/i, '')
        .trim();
      
      if (!fullName.toUpperCase().startsWith(productId.toUpperCase())) {
        const idIndex = fullName.toUpperCase().indexOf(productId.toUpperCase());
        if (idIndex >= 0) {
          fullName = fullName.substring(idIndex).trim();
        } else {
          fullName = `${productId} – ${fullName}`;
        }
      }
      return fullName;
    }

    return null;
  } catch (error: any) {
    return null;
  }
}

async function updateProducts() {
  console.log('🔄 Updating similar products with full names...\n');

  for (const [productId, expectedBaseName] of Object.entries(PRODUCTS_TO_UPDATE)) {
    console.log(`\n🔍 Processing ${productId}...`);

    try {
      // Get current product
      const getResponse = await axios.get(`${API_BASE_URL}/products/${productId}`, {
        timeout: 30000
      });
      
      const product = getResponse.data;
      console.log(`   Current name: "${product.name}"`);
      console.log(`   Current full_name: "${product.full_name}"`);

      // Extract the description from expected base name (everything after "–")
      const description = expectedBaseName.split('–')[1]?.trim() || '';
      
      // Create full name with product ID prefix + description
      const newFullName = `${productId} – ${description}`;
      
      console.log(`   New full name: "${newFullName}"`);

      // Try scraping first to see if we can get a better name
      const scrapedName = await scrapeFullName(productId);
      if (scrapedName && scrapedName.includes('–')) {
        console.log(`   ✅ Found scraped name: "${scrapedName}"`);
        // Use scraped name if it's better
        const finalName = scrapedName;
        
        // Update product
        const updateResponse = await axios.put(
          `${API_BASE_URL}/products/${productId}`,
          {
            name: finalName,
            full_name: finalName
          },
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        if (updateResponse.data.success) {
          console.log(`   ✅ Updated successfully`);
        } else {
          console.error(`   ❌ Update failed: ${updateResponse.data.message}`);
        }
      } else {
        // Use the constructed name
        console.log(`   Using constructed name: "${newFullName}"`);
        
        const updateResponse = await axios.put(
          `${API_BASE_URL}/products/${productId}`,
          {
            name: newFullName,
            full_name: newFullName
          },
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        if (updateResponse.data.success) {
          console.log(`   ✅ Updated successfully`);
        } else {
          console.error(`   ❌ Update failed: ${updateResponse.data.message}`);
        }
      }
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.response?.data?.message || error.message}`);
    }

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Update complete!');
  console.log('='.repeat(80));
}

updateProducts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

