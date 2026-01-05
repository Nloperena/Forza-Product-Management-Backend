import { databaseService } from '../services/database';
import { ProductModel } from '../models/Product';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Convert text to title case while preserving acronyms and hyphenated words
 */
function toTitleCase(text: string): string {
  if (!text) return text;
  
  // Split by spaces and process each word
  return text
    .split(/\s+/)
    .map(word => {
      // Skip empty words
      if (!word) return word;
      
      // Preserve acronyms (2+ consecutive uppercase letters)
      // Pattern: all uppercase, 2+ chars, may have hyphens and numbers
      const allUppercaseAcronym = /^[A-Z0-9-]{2,}$/;
      if (allUppercaseAcronym.test(word) && word === word.toUpperCase()) {
        return word;
      }
      
      // Handle hyphenated words (like "High-Temp", "Double-Coated")
      if (word.includes('-')) {
        return word
          .split('-')
          .map(part => {
            // Preserve acronyms in hyphenated parts
            if (allUppercaseAcronym.test(part) && part === part.toUpperCase()) {
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
 * Format: "ProductID - Description" -> "ProductID - Title Case Description"
 * Preserves product ID as-is (including acronyms like C-T557, TAC-850GR)
 */
function fixProductNameCasing(name: string, productId: string): string {
  if (!name) return productId;
  
  // First, fix any incorrectly split product IDs (like "C - T557" -> "C-T557")
  // Check if the name starts with product ID parts separated by spaces
  let fixedName = name;
  
  // Pattern to detect incorrectly split IDs: "C - T557" or "TAC - 850GR"
  // We'll reconstruct using the actual productId
  if (name.includes(' - ') && !name.startsWith(productId)) {
    // Try to reconstruct: if name starts with part of productId, fix it
    const parts = name.split(' - ');
    if (parts.length >= 2) {
      const firstPart = parts[0].trim();
      // Check if first part + second part's first word matches productId pattern
      const secondPartFirst = parts[1].split(/\s+/)[0];
      const potentialId = `${firstPart}-${secondPartFirst}`;
      
      // If this matches the productId, reconstruct it
      if (potentialId === productId || potentialId.toUpperCase() === productId.toUpperCase()) {
        const description = parts.slice(1).join(' - ').substring(secondPartFirst.length).trim();
        fixedName = `${productId} - ${description}`;
      }
    }
  }
  
  // Now split by " - " to separate product ID from description
  const dashIndex = fixedName.indexOf(' - ');
  
  if (dashIndex === -1) {
    // No " - " separator, check if it starts with product ID
    if (fixedName.startsWith(productId)) {
      // Extract description part after product ID
      const description = fixedName.substring(productId.length).trim();
      // Remove leading dashes/spaces
      const cleanDescription = description.replace(/^[-–—\s]+/, '').trim();
      if (cleanDescription) {
        return `${productId} - ${toTitleCase(cleanDescription)}`;
      }
      return productId;
    }
    // No product ID prefix, just title case the whole thing
    return toTitleCase(fixedName);
  }
  
  // Split at " - "
  let idPart = fixedName.substring(0, dashIndex).trim();
  const descriptionPart = fixedName.substring(dashIndex + 3).trim();
  
  // Ensure idPart matches productId (fix any incorrect splits)
  if (idPart !== productId) {
    // Check if idPart is a split version of productId
    const idParts = idPart.split(/\s+/);
    if (idParts.length > 1) {
      const reconstructed = idParts.join('-');
      if (reconstructed === productId || reconstructed.toUpperCase() === productId.toUpperCase()) {
        idPart = productId;
      }
    }
  }
  
  if (!descriptionPart) {
    return idPart;
  }
  
  // Convert description to title case
  const titleCasedDescription = toTitleCase(descriptionPart);
  
  // Reconstruct: "ProductID - Title Cased Description"
  return `${idPart} - ${titleCasedDescription}`;
}

class ProductNameCasingFixer {
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
          console.log(`   "${oldName}" -> "${newName}"`);

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

    const fixer = new ProductNameCasingFixer();
    await fixer.fixAllProductNames();

    console.log('\n✅ Product name casing fix completed!');
  } catch (error) {
    console.error('❌ Failed to fix product name casing:', error);
    process.exit(1);
  } finally {
    await databaseService.disconnect();
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

export { ProductNameCasingFixer, fixProductNameCasing };

