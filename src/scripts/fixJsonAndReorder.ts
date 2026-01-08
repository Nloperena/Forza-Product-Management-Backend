import * as fs from 'fs';
import * as path from 'path';

const JSON_FILE_PATH = path.join(__dirname, '../../backend/backend/data/forza_products_organized.json');

function updateJson() {
  const data = JSON.parse(fs.readFileSync(JSON_FILE_PATH, 'utf-8'));
  const organized = data.forza_products_organized;

  // 1. Update all image URLs to use optimized path and webp extension
  const updateImages = (obj: any) => {
    if (Array.isArray(obj)) {
      obj.forEach(updateImages);
    } else if (obj && typeof obj === 'object') {
      if (obj.image && typeof obj.image === 'string') {
        // Fix typo 'optmized' if any remains (though already handled)
        obj.image = obj.image.replace('/product-images-web-optmized/', '/product-images-web-optimized/');
        
        // Ensure web-optimized path
        if (obj.image.includes('/product-images/') && !obj.image.includes('/product-images-web-optimized/')) {
          obj.image = obj.image.replace('/product-images/', '/product-images-web-optimized/');
        }
        
        // Ensure webp extension for blob links
        if (obj.image.includes('public.blob.vercel-storage.com') && obj.image.endsWith('.png')) {
          obj.image = obj.image.replace('.png', '.webp');
        }
      }
      Object.keys(obj).forEach(key => {
        if (key !== 'image') updateImages(obj[key]);
      });
    }
  };

  updateImages(organized);

  // 2. Handle the "bottom 4" replacement for Industrial Industry
  const industrialProducts = organized.forza_bond.products.industrial_industry.products;
  
  // IDs to remove
  const toRemove = ['R160', 'R221', 'R519', 'R529'];
  // IDs to move to bottom (as replacements)
  const toMoveToBottom = ['FRP', '81-0389', 'S228', 'OSA'];

  // Filter out the removed and the ones to be moved
  let filtered = industrialProducts.filter((p: any) => 
    !toRemove.includes(p.product_id) && !toMoveToBottom.includes(p.product_id)
  );

  // Get the objects for the products we're moving to the bottom
  const movedObjects = toMoveToBottom.map(id => 
    industrialProducts.find((p: any) => p.product_id === id)
  ).filter(Boolean);

  // Append them to the end
  organized.forza_bond.products.industrial_industry.products = [...filtered, ...movedObjects];

  fs.writeFileSync(JSON_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  console.log('✅ JSON updated successfully!');
}

updateJson();

