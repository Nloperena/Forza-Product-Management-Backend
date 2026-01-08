import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Convert text to title case while preserving acronyms and product IDs
 * Examples:
 * - "DOUBLE-COATED" -> "Double-Coated"
 * - "ULTRA HIGH BOND" -> "Ultra High Bond"
 * - "C-T557" -> "C-T557" (preserved)
 * - "PE FOAM" -> "PE Foam" (PE stays uppercase as acronym)
 */
function toTitleCase(text: string): string {
  if (!text) return text;
  
  // Split by spaces and process each word
  return text
    .split(/\s+/)
    .map(word => {
      // Skip empty words
      if (!word) return word;
      
      // Preserve acronyms (2+ consecutive uppercase letters, may include numbers/hyphens)
      // Pattern: all uppercase, 2+ chars, may have hyphens and numbers
      // Examples: "PE", "HPL", "VOC", "CA", "FSK", "RTV"
      const acronymPattern = /^[A-Z]{2,}$/; // Pure acronyms (2+ uppercase letters, no numbers/hyphens)
      const productIdPattern = /^[A-Z0-9-]{2,}$/; // Product IDs like "C-T557", "TAC-850GR"
      
      // If it's a pure acronym (like "PE", "VOC", "CA"), keep it uppercase
      if (acronymPattern.test(word) && word === word.toUpperCase() && word.length <= 5) {
        return word;
      }
      
      // If it looks like a product ID (has hyphens and numbers/letters), keep it uppercase
      if (productIdPattern.test(word) && word === word.toUpperCase() && word.includes('-')) {
        return word;
      }
      
      // Handle hyphenated words (like "High-Temp", "Double-Coated")
      if (word.includes('-')) {
        return word
          .split('-')
          .map(part => {
            // Preserve acronyms in hyphenated parts
            if (acronymPattern.test(part) && part === part.toUpperCase() && part.length <= 5) {
              return part;
            }
            // Title case each part
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
          })
          .join('-');
      }
      
      // Regular word: capitalize first letter, lowercase the rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Fix product name casing
 * Format: "ProductID - ALL CAPS DESCRIPTION" -> "ProductID - Title Case Description"
 * Preserves product ID as-is (including acronyms like C-T557, TAC-850GR)
 */
function fixProductNameCasing(name: string, productId: string): string {
  if (!name) return productId;
  
  // First, ensure product ID is preserved correctly
  let fixedName = name.trim();
  
  // Check if name starts with product ID
  const idUpper = productId.toUpperCase();
  const nameUpper = fixedName.toUpperCase();
  
  // Find where the product ID ends and description begins
  let descriptionStart = -1;
  
  // Try to find " - " separator first
  const dashIndex = fixedName.indexOf(' - ');
  if (dashIndex !== -1) {
    const idPart = fixedName.substring(0, dashIndex).trim();
    // If the ID part matches productId (case-insensitive), use it
    if (idPart.toUpperCase() === idUpper) {
      const description = fixedName.substring(dashIndex + 3).trim();
      if (description) {
        return `${productId} - ${toTitleCase(description)}`;
      }
      return productId;
    }
  }
  
  // If name starts with product ID (case-insensitive)
  if (nameUpper.startsWith(idUpper)) {
    // Extract everything after the product ID
    const afterId = fixedName.substring(productId.length).trim();
    
    // Remove leading dashes, spaces, hyphens
    const cleanDescription = afterId.replace(/^[-–—\s]+/, '').trim();
    
    if (cleanDescription) {
      return `${productId} - ${toTitleCase(cleanDescription)}`;
    }
    return productId;
  }
  
  // If name doesn't start with product ID, try to find it
  const idIndex = nameUpper.indexOf(idUpper);
  if (idIndex !== -1) {
    const beforeId = fixedName.substring(0, idIndex).trim();
    const afterId = fixedName.substring(idIndex + productId.length).trim();
    const cleanDescription = afterId.replace(/^[-–—\s]+/, '').trim();
    
    if (cleanDescription) {
      return `${productId} - ${toTitleCase(cleanDescription)}`;
    }
  }
  
  // If we can't find the product ID, just title case the whole thing
  // but try to preserve the product ID if it appears
  if (nameUpper.includes(idUpper)) {
    const parts = fixedName.split(new RegExp(idUpper, 'i'));
    if (parts.length === 2) {
      const before = parts[0].trim();
      const after = parts[1].trim().replace(/^[-–—\s]+/, '').trim();
      if (after) {
        return `${productId} - ${toTitleCase(after)}`;
      }
    }
  }
  
  // Last resort: title case everything
  return toTitleCase(fixedName);
}

class ProductNameTitleCaseFixer {
  private productModel: ProductModel;

  constructor() {
    if (databaseService.isPostgres()) {
      this.productModel = new ProductModel();
    } else {
      this.productModel = new ProductModel(databaseService.getDatabase());
    }
  }

  async fixAllProductNames(): Promise<void> {
    console.log('🔤 Fixing product name casing to title case...\n');
    console.log('Preserving product IDs and acronyms (like C-T557, PE, VOC, CA)\n');
    console.log('='.repeat(80));

    try {
      const products = await this.productModel.getAllProducts();
      console.log(`Found ${products.length} products to check\n`);

      let updatedCount = 0;
      let skippedCount = 0;
      const errors: Array<{ productId: string; error: string }> = [];

      for (const product of products) {
        try {
          const oldName = product.name;
          const newName = fixProductNameCasing(oldName, product.product_id);
          
          // Check if name needs updating
          if (oldName === newName) {
            skippedCount++;
            continue;
          }

          // Update product - only update name field
          await this.productModel.updateProduct(product.product_id, {
            name: newName
          } as any);

          updatedCount++;
          console.log(`✅ Updated ${product.product_id}:`);
          console.log(`   "${oldName}"`);
          console.log(`   "${newName}"`);

        } catch (error: any) {
          errors.push({
            productId: product.product_id,
            error: error.message || 'Unknown error'
          });
          console.error(`❌ Error updating ${product.product_id}:`, error.message);
        }
      }

      console.log(`\n${'='.repeat(80)}`);
      console.log('📊 SUMMARY');
      console.log('='.repeat(80));
      console.log(`✅ Updated: ${updatedCount} products`);
      console.log(`⏭️  Skipped: ${skippedCount} products`);
      console.log(`❌ Errors: ${errors.length} products`);

      if (errors.length > 0) {
        console.log(`\n❌ Errors:`);
        errors.forEach(e => console.log(`  - ${e.productId}: ${e.error}`));
      }

    } catch (error) {
      console.error('❌ Fatal error:', error);
      throw error;
    }
  }
}

async function main() {
  try {
    await databaseService.connect();
    await databaseService.initializeDatabase();

    const fixer = new ProductNameTitleCaseFixer();
    await fixer.fixAllProductNames();

    console.log('\n✅ Product name title case fix completed!');
  } catch (error) {
    console.error('❌ Failed to fix product name title case:', error);
    process.exit(1);
  } finally {
    await databaseService.disconnect();
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

export { ProductNameTitleCaseFixer, fixProductNameCasing };

