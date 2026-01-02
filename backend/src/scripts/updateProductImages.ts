import * as fs from 'fs';
import * as path from 'path';

interface ImageMapping {
  productId: string;
  category: 'Composites' | 'Industrial';
  imageFilename: string;
}

// Mapping of new image filenames to product IDs
const imageMappings: ImageMapping[] = [
  // Composites
  { productId: 'TAC-734G', category: 'Composites', imageFilename: 'TAC-734G Canister and Aerosol.png' },
  { productId: 'TAC-735R', category: 'Composites', imageFilename: 'TAC-735R 22L and Aerosol.png' },
  { productId: 'TAC-738R', category: 'Composites', imageFilename: 'TAC-738R 22L and Aerosol.png' },
  { productId: 'TAC-739R', category: 'Composites', imageFilename: 'TAC-739R 22L and Aerosol.png' },
  { productId: 'TAC-OS74', category: 'Composites', imageFilename: 'TAC-OS74 Sausage.png' },
  { productId: 'TAC-OS75', category: 'Composites', imageFilename: 'TAC-OS75 Cartridge.png' },
  { productId: 'TAC-R750', category: 'Composites', imageFilename: 'TAC-R750 2 Part.png' },
  { productId: 'TAC-R777', category: 'Composites', imageFilename: 'TAC-R777 Drum.png' },
  { productId: 'TAC-734G', category: 'Composites', imageFilename: 'TAC-734G Canister and Aerosol.png' },
  { productId: 'TAC-850GR', category: 'Composites', imageFilename: 'TAC850GR 22L.png' },
  
  // Industrial
  { productId: '81-0389', category: 'Industrial', imageFilename: '81-0389 5 gal pail.png' },
  { productId: 'C130', category: 'Industrial', imageFilename: 'C130 Drum.png' },
  { productId: 'C150', category: 'Industrial', imageFilename: 'C150 1 gal pail.png' },
  { productId: 'C331', category: 'Industrial', imageFilename: 'C331 5 gal Pail.png' },
  { productId: 'CA1000', category: 'Industrial', imageFilename: 'CA1000 Container.png' },
  { productId: 'CA1500', category: 'Industrial', imageFilename: 'CA1500 Container.png' },
  { productId: 'CA2400', category: 'Industrial', imageFilename: 'CA2400 Container.png' },
  { productId: 'FRP', category: 'Industrial', imageFilename: 'FRP 3.5 gal pail.png' },
  { productId: 'IC932', category: 'Industrial', imageFilename: 'IC932 Canister.png' },
  { productId: 'IC933', category: 'Industrial', imageFilename: 'IC933 Canister and Aerosol.png' },
  { productId: 'IC934', category: 'Industrial', imageFilename: 'IC934 Canister and Aerosol.png' },
  { productId: 'IC946', category: 'Industrial', imageFilename: 'IC946 Canister and Aerosol.png' },
  { productId: 'IC947', category: 'Industrial', imageFilename: 'IC947 Canister.png' },
  { productId: 'OA12', category: 'Industrial', imageFilename: 'OA12 Cartridge.png' },
  { productId: 'OA13', category: 'Industrial', imageFilename: 'OA13 Cartridge.png' },
  { productId: 'OA23', category: 'Industrial', imageFilename: 'OA23 Sausage.png' },
  { productId: 'OA4', category: 'Industrial', imageFilename: 'OA4 Cartridge.png' },
  { productId: 'OS10', category: 'Industrial', imageFilename: 'OS10 Cartridge.png' },
  { productId: 'OS2', category: 'Industrial', imageFilename: 'OS2 Cartridge.png' },
  { productId: 'OS20', category: 'Industrial', imageFilename: 'OS20 Sausage.png' },
  { productId: 'OS24', category: 'Industrial', imageFilename: 'OS24 Cartridge.png' },
  { productId: 'OS25', category: 'Industrial', imageFilename: 'OS25 Cartridge.png' },
  { productId: 'OS31', category: 'Industrial', imageFilename: 'OS31 Cartridge.png' },
  { productId: 'OS35', category: 'Industrial', imageFilename: 'OS35 Cartridge.png' },
  { productId: 'OS37', category: 'Industrial', imageFilename: 'OS37 Cartridge.png' },
  { productId: 'OS61', category: 'Industrial', imageFilename: 'OS61 Cartridge.png' },
  { productId: 'OSA', category: 'Industrial', imageFilename: 'OSA tin can.png' },
  { productId: 'R160', category: 'Industrial', imageFilename: 'R160 2 part.png' },
  { productId: 'R221', category: 'Industrial', imageFilename: 'R221 2 part.png' },
  { productId: 'R519', category: 'Industrial', imageFilename: 'R519 2 part.png' },
  { productId: 'S228', category: 'Industrial', imageFilename: 'S228 1 gal pail.png' },
  { productId: 'T305', category: 'Industrial', imageFilename: 'T305- Foam Tape.png' },
  { productId: 'T350', category: 'Industrial', imageFilename: 'T350- Thermal Break Tape.png' },
  { productId: 'T600', category: 'Industrial', imageFilename: 'T600 Foam Gasketing Tape.png' },
  { productId: 'T900', category: 'Industrial', imageFilename: 'T900 Butyl Tape.png' },
  { productId: 'T950', category: 'Industrial', imageFilename: 'T950 FSK Bonding Tape.png' },
  { productId: 'T970', category: 'Industrial', imageFilename: 'T970 Foil Bonding Tape.png' },
];

const BASE_URL = 'https://jw4to4yw6mmciodr.public.blob.vercel-storage.com/product-images';

interface ForzaProduct {
  product_id: string;
  image?: string;
  [key: string]: any;
}

interface ForzaData {
  forza_products_organized: {
    [key: string]: any;
  };
}

function updateProductImages(): void {
  try {
    console.log('🔄 Starting product image URL update...\n');
    
    // Load JSON file
    const jsonPath = path.join(__dirname, '../../data/forza_products_organized.json');
    const jsonData: ForzaData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    // Create a map for quick lookup
    const imageMap = new Map<string, ImageMapping>();
    imageMappings.forEach(mapping => {
      imageMap.set(mapping.productId, mapping);
    });
    
    let updatedCount = 0;
    let notFoundCount = 0;
    const notFoundProducts: string[] = [];
    
    // Recursive function to update products
    function updateProductsInObject(obj: any): void {
      if (Array.isArray(obj)) {
        obj.forEach(item => updateProductsInObject(item));
      } else if (obj && typeof obj === 'object') {
        // Check if this is a product object
        if (obj.product_id && typeof obj.product_id === 'string') {
          const mapping = imageMap.get(obj.product_id);
          if (mapping) {
            const newImageUrl = `${BASE_URL}/${mapping.category}/${mapping.imageFilename}`;
            const oldImageUrl = obj.image;
            
            if (oldImageUrl !== newImageUrl) {
              obj.image = newImageUrl;
              updatedCount++;
              console.log(`✅ Updated ${obj.product_id}: ${oldImageUrl} -> ${newImageUrl}`);
            } else {
              console.log(`⏭️  ${obj.product_id} already has correct URL`);
            }
          } else {
            // Check if product should be updated but wasn't in mapping
            if (obj.image && !obj.image.includes('placeholder')) {
              notFoundProducts.push(obj.product_id);
            }
          }
        }
        
        // Recursively process all properties
        Object.values(obj).forEach(value => updateProductsInObject(value));
      }
    }
    
    // Update all products
    updateProductsInObject(jsonData);
    
    // Save updated JSON
    fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf8');
    
    console.log(`\n🎉 Product image update completed!`);
    console.log(`✅ Updated: ${updatedCount} products`);
    
    if (notFoundProducts.length > 0) {
      console.log(`\n⚠️  Products with images not in mapping (${notFoundProducts.length}):`);
      notFoundProducts.slice(0, 10).forEach(id => console.log(`   - ${id}`));
      if (notFoundProducts.length > 10) {
        console.log(`   ... and ${notFoundProducts.length - 10} more`);
      }
    }
    
    // Show summary of mappings
    console.log(`\n📋 Image mappings applied: ${imageMappings.length}`);
    console.log(`   - Composites: ${imageMappings.filter(m => m.category === 'Composites').length}`);
    console.log(`   - Industrial: ${imageMappings.filter(m => m.category === 'Industrial').length}`);
    
  } catch (error) {
    console.error('❌ Error updating product images:', error);
    throw error;
  }
}

// Run the update
if (require.main === module) {
  updateProductImages();
}

export { updateProductImages };

