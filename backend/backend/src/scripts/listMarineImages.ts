import * as fs from 'fs';
import * as path from 'path';

const JSON_FILE_PATH = path.join(__dirname, '../../data/forza_products_organized.json');

async function listImages() {
  const jsonData = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf-8'));
  const images = new Set<string>();
  
  const processProduct = (product: any) => {
    if (product.industry === 'marine_industry' || product.industry === 'composites_industry') {
      images.add(product.image || '');
    }
  };

  const organized = jsonData.forza_products_organized;
  for (const brandKey in organized) {
    const brand = organized[brandKey];
    if (brand.products) {
      for (const industryKey in brand.products) {
        const industry = brand.products[industryKey];
        if (industry.products) {
          industry.products.forEach(processProduct);
        }
      }
    }
  }

  console.log('--- Marine/Composite Images in JSON ---');
  Array.from(images).sort().forEach(img => console.log(img));
}

listImages().catch(console.error);






