import { Request, Response } from 'express';
import { ProductModel, Product } from '../models/Product';
import { databaseService } from '../services/database';

export class ProductController {
  private productModel: ProductModel;

  constructor() {
    this.productModel = new ProductModel(databaseService.getDatabase());
  }

  async getAllProducts(_req: Request, res: Response): Promise<void> {
    try {
      const products = await this.productModel.getAllProducts();
      res.json(products);
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
        full_name,
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
        published = true,
        last_edited
      } = req.body;

      // Validate required fields
      if (!product_id || !name || !full_name || !brand || !industry) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: product_id, name, full_name, brand, industry'
        });
        return;
      }

      // Calculate benefits count
      const benefits_count = Array.isArray(benefits) ? benefits.length : 0;

      const productData: Omit<Product, 'id' | 'created_at' | 'updated_at'> = {
        product_id,
        name,
        full_name,
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
        published: Boolean(published),
        benefits_count,
        last_edited: last_edited || new Date().toISOString()
      };

      const newProduct = await this.productModel.createProduct(productData);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        product_id: newProduct.id
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
      const updates = req.body;

      // Remove fields that shouldn't be updated directly
      delete updates.id;
      delete updates.product_id;
      delete updates.created_at;
      delete updates.updated_at;

      // Recalculate benefits_count if benefits are being updated
      if (updates.benefits && Array.isArray(updates.benefits)) {
        updates.benefits_count = updates.benefits.length;
      }

      const updatedProduct = await this.productModel.updateProduct(id, updates);

      if (!updatedProduct) {
        res.status(404).json({
          success: false,
          message: 'Product not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Product updated successfully'
      });
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update product',
        error: error instanceof Error ? error.message : 'Unknown error'
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
      const deleted = await this.productModel.deleteProduct(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Product not found'
        });
        return;
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
        metadata: stats,
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
}
