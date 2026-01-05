import { ProductModel, Product } from '../models/Product';
import { databaseService } from '../services/database';

class ProductCleanup {
  private productModel: ProductModel | null = null;

  async initialize(): Promise<void> {
    // Connect to database first
    await databaseService.connect();
    await databaseService.initializeDatabase();

    // Then initialize ProductModel
    if (databaseService.isPostgres()) {
      this.productModel = new ProductModel();
    } else {
      this.productModel = new ProductModel(databaseService.getDatabase());
    }
  }

  async deleteProducts(productIds: string[]): Promise<void> {
    if (!this.productModel) {
      throw new Error('ProductModel not initialized');
    }

    console.log(`\n🗑️  Deleting ${productIds.length} products...`);
    
    for (const productId of productIds) {
      try {
        const deleted = await this.productModel.deleteProduct(productId);
        if (deleted) {
          console.log(`  ✅ Deleted: ${productId}`);
        } else {
          console.log(`  ⚠️  Not found: ${productId}`);
        }
      } catch (error) {
        console.error(`  ❌ Error deleting ${productId}:`, error);
      }
    }
  }

  async mergeProducts(sourceId: string, targetId: string): Promise<void> {
    if (!this.productModel) {
      throw new Error('ProductModel not initialized');
    }

    console.log(`\n🔄 Merging ${sourceId} into ${targetId}...`);
    
    try {
      // Get both products
      const sourceProduct = await this.productModel.getProductById(sourceId);
      const targetProduct = await this.productModel.getProductById(targetId);

      if (!sourceProduct) {
        console.log(`  ⚠️  Source product not found: ${sourceId}`);
        return;
      }

      if (!targetProduct) {
        console.log(`  ⚠️  Target product not found: ${targetId}`);
        return;
      }

      // Merge data: combine arrays, prefer target values for conflicts
      const mergedUpdates: Partial<Product> = {
        // Merge benefits (unique values)
        benefits: [
          ...(targetProduct.benefits || []),
          ...(sourceProduct.benefits || [])
        ].filter((value, index, self) => self.indexOf(value) === index),
        
        // Merge applications (unique values)
        applications: [
          ...(targetProduct.applications || []),
          ...(sourceProduct.applications || [])
        ].filter((value, index, self) => self.indexOf(value) === index),
        
        // Merge technical properties (unique by property name)
        technical: this.mergeTechnicalProperties(
          targetProduct.technical || [],
          sourceProduct.technical || []
        ),
        
        // Merge sizing (unique values)
        sizing: [
          ...(targetProduct.sizing || []),
          ...(sourceProduct.sizing || [])
        ].filter((value, index, self) => self.indexOf(value) === index),
      };

      // Update benefits count
      mergedUpdates.benefits_count = mergedUpdates.benefits?.length || 0;

      // Use source description if target is empty, otherwise keep target
      if (!targetProduct.description && sourceProduct.description) {
        mergedUpdates.description = sourceProduct.description;
      }

      // Use source chemistry if target is empty, otherwise keep target
      if (!targetProduct.chemistry && sourceProduct.chemistry) {
        mergedUpdates.chemistry = sourceProduct.chemistry;
      }

      // Update target product with merged data
      await this.productModel.updateProduct(targetId, mergedUpdates);
      console.log(`  ✅ Merged data into ${targetId}`);

      // Delete source product
      const deleted = await this.productModel.deleteProduct(sourceId);
      if (deleted) {
        console.log(`  ✅ Deleted source product: ${sourceId}`);
      } else {
        console.log(`  ⚠️  Could not delete source product: ${sourceId}`);
      }

    } catch (error) {
      console.error(`  ❌ Error merging ${sourceId} into ${targetId}:`, error);
      throw error;
    }
  }

  private mergeTechnicalProperties(
    target: any[],
    source: any[]
  ): any[] {
    const merged: any[] = [...target];
    const existingProperties = new Set(
      target.map((t: any) => 
        typeof t === 'object' && t.property ? t.property.toLowerCase() : String(t)
      )
    );

    for (const sourceProp of source) {
      if (typeof sourceProp === 'object' && sourceProp.property) {
        const propKey = sourceProp.property.toLowerCase();
        if (!existingProperties.has(propKey)) {
          merged.push(sourceProp);
          existingProperties.add(propKey);
        }
      } else {
        const propStr = String(sourceProp);
        if (!existingProperties.has(propStr.toLowerCase())) {
          merged.push(sourceProp);
          existingProperties.add(propStr.toLowerCase());
        }
      }
    }

    return merged;
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Starting product cleanup...\n');

    try {
      // Initialize database connection and ProductModel
      await this.initialize();

      // Products to delete (using correct case from database)
      const productsToDelete = [
        'I1000',      // Found in DB
        'R529',       // Found in DB
        'OS55',       // Found in DB
        'T461',       // Found in DB
        'T500',       // Found in DB
        'T464',       // Found in DB
        'MC739',      // Found in DB
        // These may not exist or have different IDs:
        'OA75',       // Check if exists
        'OA99',       // Check if exists
        'FC-CAR',     // Check if exists
        'OS45',       // Check if exists
        'T-T246',     // Check if exists
      ];

      // Delete products
      await this.deleteProducts(productsToDelete);

      // Products to merge (using correct case from database)
      const merges = [
        { source: 'CC503-AA', target: 'CC503' },  // CC503-AA exists, CC503 exists
        // Note: os61-adhesive doesn't exist in DB, only OS61 exists - no merge needed
        // Note: ic946--ca-compliant-pressure-sensitive-contact-adhesive doesn't exist
        // IC946 exists, so no merge needed for that one
      ];

      // Merge products
      for (const merge of merges) {
        await this.mergeProducts(merge.source, merge.target);
      }

      // Note: Verification cases (c-w6106 vs c-w61606, tac850 vs tac850gr) 
      // are left for manual review as they require verification

      console.log('\n✅ Product cleanup completed successfully!');
      console.log(`\n📊 Summary:`);
      console.log(`   - Deleted: ${productsToDelete.length} products`);
      console.log(`   - Merged: ${merges.length} products`);
      console.log(`   - Verification required: 2 products (c-w6106/c-w61606, tac850/tac850gr)`);

    } catch (error) {
      console.error('\n❌ Error during cleanup:', error);
      throw error;
    }
  }
}

// Run cleanup if executed directly
if (require.main === module) {
  const cleanup = new ProductCleanup();
  cleanup.cleanup()
    .then(() => {
      console.log('\n✨ All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Cleanup failed:', error);
      process.exit(1);
    });
}

export { ProductCleanup };

