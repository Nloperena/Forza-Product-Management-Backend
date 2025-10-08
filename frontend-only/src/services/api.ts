import axios from 'axios';
import type { Product, ProductStats, BrandIndustryCounts, ProductFormData } from '@/types/product';

// Default API base URL - use Heroku by default (can be overridden by ApiContext)
const DEFAULT_API_BASE = 'https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com';

// Create a function to get the current API base URL
let currentApiBase = DEFAULT_API_BASE;

export const setApiBaseUrl = (baseUrl: string) => {
  currentApiBase = baseUrl;
  // Update the axios instance base URL
  api.defaults.baseURL = `${baseUrl}/api`;
};

export const getApiBaseUrl = () => {
  // Always prioritize the context-set URL over environment variable
  return currentApiBase || DEFAULT_API_BASE;
};

// Create axios instance with default base URL
const api = axios.create({
  baseURL: `${DEFAULT_API_BASE}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for CORS with credentials
  timeout: 30000, // 30 second timeout for Heroku cold starts
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    // If it's a timeout error, suggest the user to wait
    if (error.code === 'ECONNABORTED') {
      console.log('⏰ Request timed out - Heroku app might be starting up. Please wait and try again.');
    }
    
    throw error;
  }
);

// Helper function to retry requests for cold starts
const retryRequest = async (requestFn: () => Promise<any>, maxRetries = 2): Promise<any> => {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' && i < maxRetries) {
        console.log(`⏰ Timeout on attempt ${i + 1}/${maxRetries + 1}. Retrying in 3 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }
      throw error;
    }
  }
};

export const productApi = {
  // Get all products
  async getProducts(): Promise<Product[]> {
    try {
      const response = await retryRequest(() => api.get<Product[]>('/products'));
      return response.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  // Get product by ID
  async getProduct(id: string): Promise<Product> {
    const response = await api.get<Product>(`/products/${id}`);
    return response.data;
  },

  // Create new product
  async createProduct(productData: ProductFormData): Promise<{ success: boolean; message: string; product_id?: string }> {
    const response = await api.post('/products', productData);
    return response.data;
  },

  // Update product
  async updateProduct(id: string, productData: Partial<ProductFormData>): Promise<{ success: boolean; message: string }> {
    const response = await api.put(`/products/${id}`, productData);
    return response.data;
  },

  // Delete product
  async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  // Get statistics
  async getStatistics(): Promise<{
    metadata: ProductStats;
    brand_industry_counts: BrandIndustryCounts;
  }> {
    const response = await retryRequest(() => api.get('/statistics'));
    return response.data;
  },

  // Get available images
  async getImages(): Promise<Array<{
    filename: string;
    path: string;
    size: number;
  }>> {
    const response = await api.get('/images');
    return response.data;
  },

  // Upload image
  async uploadImage(file: File): Promise<{
    success: boolean;
    message: string;
    filename?: string;
    filepath?: string;
  }> {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await api.post('/images/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },

  // Upload image to Vercel Blob (alternative endpoint)
  async uploadImageToBlob(file: File): Promise<{
    success: boolean;
    message: string;
    url?: string;
  }> {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  },
};

export default productApi;
