import { Request, Response } from 'express';
import { ProductModel, Product } from '../models/Product';
import { databaseService } from '../services/database';
import * as XLSX from 'xlsx';
import { isProductAllowed, ALLOWED_PRODUCT_IDS } from '../config/allowedProducts';
import { auditLogModel } from '../models/AuditLog';

export class ProductController {
  private productModel: ProductModel;

  constructor() {
    // For PostgreSQL, don't pass database instance - ProductModel will handle it internally
    // For SQLite, pass the database instance
    if (databaseService.isPostgres()) {
      this.productModel = new ProductModel();
    } else {
      this.productModel = new ProductModel(databaseService.getDatabase());
    }
  }

  async getAllProducts(req: Request, res: Response): Promise<void> {
    try {
      const { published } = req.query;
      const publishedFilter = published as string | undefined;
      const products = await this.productModel.getAllProducts(publishedFilter);
      
      // Filter by whitelist (enabled by default, set ENABLE_PRODUCT_WHITELIST=false to disable)
      const enableWhitelist = process.env.ENABLE_PRODUCT_WHITELIST !== 'false';
      let filteredProducts = products;
      
      if (enableWhitelist) {
        filteredProducts = products.filter(product => isProductAllowed(product.product_id));
        console.log(`📋 Product whitelist enabled: Showing ${filteredProducts.length} of ${products.length} products`);
      }
      
      res.json(filteredProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch products',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, message: 'Product ID is required' });
        return;
      }
      const product = await this.productModel.getProductById(id);

      if (!product) {
        res.status(404).json({ 
          success: false, 
          message: 'Product not found' 
        });
        return;
      }

      res.json(product);
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch product',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const {
        product_id,
        name,
        description,
        brand,
        industry,
        chemistry,
        url,
        image,
        benefits,
        applications,
        technical,
        sizing,
        color,
        cleanup,
        recommended_equipment,
        published = true,
        last_edited
      } = req.body;

      // Validate required fields
      if (!product_id || !name || !brand || !industry) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: product_id, name, brand, industry'
        });
        return;
      }

      const productData: Omit<Product, 'created_at' | 'updated_at'> = {
        id: product_id, // Add id for compatibility
        product_id,
        name,
        full_name: name, // Set for compatibility
        description: description || '',
        brand,
        industry,
        chemistry: chemistry || '',
        url: url || '',
        image: image || '/placeholder-product.svg',
        benefits: Array.isArray(benefits) ? benefits : [],
        applications: Array.isArray(applications) ? applications : [],
        technical: Array.isArray(technical) ? technical : [],
        sizing: Array.isArray(sizing) ? sizing : [],
        color: color || '',
        cleanup: cleanup || '',
        recommended_equipment: recommended_equipment || '',
        published: Boolean(published),
        benefits_count: Array.isArray(benefits) ? benefits.length : 0, // Set for compatibility
        last_edited: last_edited || new Date().toISOString()
      };

      const newProduct = await this.productModel.createProduct(productData);

      // Log the creation
      const userName = req.body.edited_by || req.headers['x-user-name'] as string || 'System';
      await auditLogModel.createLog({
        action: 'CREATE',
        entity_type: 'product',
        entity_id: newProduct.product_id,
        user_name: userName,
        user_email: req.headers['x-user-email'] as string,
        changes_summary: `Created new product "${newProduct.name}" (${newProduct.product_id})`,
        after_data: JSON.stringify(newProduct),
        ip_address: req.ip || req.socket?.remoteAddress,
        user_agent: req.headers['user-agent']
      });

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        product_id: newProduct.product_id
      });
    } catch (error) {
      console.error('Error creating product:', error);
      
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        res.status(409).json({
          success: false,
          message: 'Product with this ID already exists'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to create product',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, message: 'Product ID is required' });
        return;
      }
      
      // Get original product for audit log
      const originalProduct = await this.productModel.getProductById(id);
      if (!originalProduct) {
        res.status(404).json({
          success: false,
          message: `Product with ID "${id}" not found`
        });
        return;
      }

      const updates = req.body;

      // Remove fields that shouldn't be updated directly
      delete updates.id;
      delete updates.product_id;
      delete updates.created_at;
      delete updates.updated_at;

      // Recalculate benefits_count if benefits are being updated
      if (updates.benefits !== undefined && Array.isArray(updates.benefits)) {
        updates.benefits_count = updates.benefits.length;
      }

      console.log(`[UpdateProduct Controller] Updating product with ID: ${id}`);
      console.log(`[UpdateProduct Controller] Update fields:`, Object.keys(updates));

      const updatedProduct = await this.productModel.updateProduct(id, updates);

      if (!updatedProduct) {
        res.status(404).json({
          success: false,
          message: `Product with ID "${id}" not found after update`
        });
        return;
      }

      // Generate changes summary
      const changedFields = Object.keys(updates).filter(key => {
        const origVal = (originalProduct as any)[key];
        const newVal = updates[key];
        if (Array.isArray(origVal) && Array.isArray(newVal)) {
          return JSON.stringify(origVal) !== JSON.stringify(newVal);
        }
        return origVal !== newVal;
      });
      
      const userName = req.body.edited_by || req.headers['x-user-name'] as string || 'System';
      await auditLogModel.createLog({
        action: 'UPDATE',
        entity_type: 'product',
        entity_id: id,
        user_name: userName,
        user_email: req.headers['x-user-email'] as string,
        changes_summary: `Updated ${changedFields.length} field(s): ${changedFields.join(', ')}`,
        before_data: JSON.stringify(originalProduct),
        after_data: JSON.stringify(updatedProduct),
        ip_address: req.ip || req.socket?.remoteAddress,
        user_agent: req.headers['user-agent']
      });

      res.json({
        success: true,
        message: 'Product updated successfully',
        product: updatedProduct
      });
    } catch (error) {
      console.error('[UpdateProduct Controller] Error updating product:', error);
      console.error('[UpdateProduct Controller] Product ID:', req.params.id);
      console.error('[UpdateProduct Controller] Update data:', JSON.stringify(req.body, null, 2));
      if (error instanceof Error) {
        console.error('[UpdateProduct Controller] Error stack:', error.stack);
        console.error('[UpdateProduct Controller] Error message:', error.message);
      }
      
      // Provide more detailed error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const statusCode = errorMessage.includes('not found') || errorMessage.includes('No product found') ? 404 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: 'Failed to update product',
        error: errorMessage,
        productId: req.params.id
      });
    }
  }

  async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, message: 'Product ID is required' });
        return;
      }
      
      // Get product before deletion for audit log
      const productBeforeDelete = await this.productModel.getProductById(id);
      if (!productBeforeDelete) {
        res.status(404).json({
          success: false,
          message: `Product with ID "${id}" not found`
        });
        return;
      }
      
      console.log(`[DeleteProduct Controller] Deleting product with ID: ${id}`);
      const deleted = await this.productModel.deleteProduct(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: `Product with ID "${id}" could not be deleted`
        });
        return;
      }

      // Log the deletion
      const userName = req.body.deleted_by || req.headers['x-user-name'] as string || 'System';
      await auditLogModel.createLog({
        action: 'DELETE',
        entity_type: 'product',
        entity_id: id,
        user_name: userName,
        user_email: req.headers['x-user-email'] as string,
        changes_summary: `Deleted product "${productBeforeDelete.name}" (${id})`,
        before_data: JSON.stringify(productBeforeDelete),
        ip_address: req.ip || req.socket?.remoteAddress,
        user_agent: req.headers['user-agent']
      });

      // If running locally (not on Heroku/Postgres), also remove from JSON files to keep them in sync
      if (!databaseService.isPostgres()) {
        try {
          const fs = require('fs');
          const path = require('path');
          const JSON_FILES = [
            path.join(__dirname, '../../data/forza_products_organized.json'),
            path.join(__dirname, '../../../data/forza_products_organized.json')
          ].filter(p => fs.existsSync(p));

          for (const jsonPath of JSON_FILES) {
            console.log(`[DeleteProduct Controller] Removing ${id} from JSON: ${jsonPath}`);
            const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
            
            let removedCount = 0;
            const removeProduct = (obj: any) => {
              if (Array.isArray(obj)) {
                for (let i = 0; i < obj.length; i++) {
                  if (obj[i] && obj[i].product_id === id) {
                    obj.splice(i, 1);
                    removedCount++;
                    i--; // Adjust index after splice
                  } else {
                    removeProduct(obj[i]);
                  }
                }
              } else if (obj && typeof obj === 'object') {
                for (const key in obj) {
                  removeProduct(obj[key]);
                }
              }
            };

            removeProduct(data);
            
            if (removedCount > 0) {
              // Update metadata
              if (data.forza_products_organized?.metadata) {
                data.forza_products_organized.metadata.total_products -= removedCount;
              }
              fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
              console.log(`[DeleteProduct Controller] Successfully removed ${id} from ${jsonPath}`);
            }
          }
        } catch (jsonErr) {
          console.error('[DeleteProduct Controller] Error syncing deletion to JSON:', jsonErr);
          // Don't fail the request if JSON sync fails, as the DB deletion succeeded
        }
      }

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete product',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getStatistics(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.productModel.getStatistics();
      const brandIndustryCounts = await this.productModel.getBrandIndustryCounts();

      res.json({
        metadata: {
          total_products: stats.total_products,
          organized_date: stats.organized_date,
          hierarchy: stats.hierarchy,
          notes: stats.notes
        },
        brand_industry_counts: brandIndustryCounts
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async exportToExcel(req: Request, res: Response): Promise<void> {
    try {
      const { published } = req.query;
      const publishedFilter = published as string | undefined;
      let products = await this.productModel.getAllProducts(publishedFilter);
      
      // Filter by whitelist (enabled by default, set ENABLE_PRODUCT_WHITELIST=false to disable)
      const enableWhitelist = process.env.ENABLE_PRODUCT_WHITELIST !== 'false';
      if (enableWhitelist) {
        products = products.filter(product => isProductAllowed(product.product_id));
      }

      // Convert products to Excel-friendly format
      const excelData = products.map((product) => {
        // Convert arrays to comma-separated strings for Excel
        const benefits = Array.isArray(product.benefits) 
          ? product.benefits.join('; ') 
          : '';
        const applications = Array.isArray(product.applications) 
          ? product.applications.join('; ') 
          : '';
        const sizing = Array.isArray(product.sizing) 
          ? product.sizing.join('; ') 
          : '';
        
        // Convert technical properties array to formatted string
        let technical = '';
        if (Array.isArray(product.technical) && product.technical.length > 0) {
          technical = product.technical
            .map((t: any) => {
              if (typeof t === 'object' && t.property && t.value) {
                return `${t.property}: ${t.value}${t.unit ? ` ${t.unit}` : ''}`;
              }
              return String(t);
            })
            .join('; ');
        }

        return {
          'Product ID': product.product_id,
          'Name': product.name,
          'Description': product.description || '',
          'Brand': product.brand,
          'Industry': product.industry,
          'Chemistry': product.chemistry || '',
          'URL': product.url || '',
          'Image': product.image || '',
          'Benefits': benefits,
          'Applications': applications,
          'Technical Properties': technical,
          'Sizing': sizing,
          'Color': product.color || '',
          'Cleanup': product.cleanup || '',
          'Equipment': product.recommended_equipment || '',
          'Published': product.published ? 'Yes' : 'No',
          'Created At': product.created_at,
          'Updated At': product.updated_at,
          'Last Edited': product.last_edited || ''
        };
      });

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Set column widths for better readability
      const columnWidths = [
        { wch: 15 }, // Product ID
        { wch: 20 }, // Name
        { wch: 50 }, // Description
        { wch: 20 }, // Brand
        { wch: 20 }, // Industry
        { wch: 20 }, // Chemistry
        { wch: 40 }, // URL
        { wch: 40 }, // Image
        { wch: 50 }, // Benefits
        { wch: 50 }, // Applications
        { wch: 50 }, // Technical Properties
        { wch: 30 }, // Sizing
        { wch: 15 }, // Color
        { wch: 20 }, // Cleanup
        { wch: 20 }, // Equipment
        { wch: 10 }, // Published
        { wch: 20 }, // Created At
        { wch: 20 }, // Updated At
        { wch: 20 }  // Last Edited
      ];
      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

      // Generate Excel file buffer
      const excelBuffer = XLSX.write(workbook, { 
        type: 'buffer', 
        bookType: 'xlsx' 
      });

      // Set response headers for file download
      const filename = `products_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Send the file
      res.send(excelBuffer);
    } catch (error) {
      console.error('Error exporting products to Excel:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export products to Excel',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
