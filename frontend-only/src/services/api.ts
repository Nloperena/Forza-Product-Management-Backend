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
  console.log('API Base URL updated to:', api.defaults.baseURL);
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
  withCredentials: false, // Changed to false - credentials can cause CORS issues
  timeout: 30000, // 30 second timeout for Heroku cold starts
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    // Enhanced error logging
    if (error.response) {
      // Server responded with error status
      console.error('Response Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        url: error.config?.url
      });
    } else if (error.request) {
      // Request made but no response received
      console.error('Network Error:', {
        message: error.message,
        code: error.code,
        url: error.config?.url
      });
    }
    
    // If it's a timeout error, suggest the user to wait
    if (error.code === 'ECONNABORTED') {
      console.log('⏰ Request timed out - Heroku app might be starting up. Please wait and try again.');
    }
    
    // If it's a network error, provide helpful message
    if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
      console.error('🌐 Network Error - Check your connection and ensure the API server is running');
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
    try {
      console.log('Creating product with data:', productData);
      const response = await retryRequest(() => api.post('/products', productData));
      console.log('Product creation response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Product creation error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },

  // Update product
  async updateProduct(id: string, productData: Partial<ProductFormData>): Promise<{ success: boolean; message: string }> {
    try {
      const fullUrl = `${api.defaults.baseURL}/products/${id}`;
      console.log('API Update Request:', {
        url: `/products/${id}`,
        fullUrl: fullUrl,
        method: 'PUT',
        data: productData,
        baseURL: api.defaults.baseURL,
        headers: api.defaults.headers
      });
      
      // Make the request with explicit error handling
      const response = await api.put(`/products/${id}`, productData, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
      
      console.log('API Update Response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });
      
      return response.data;
    } catch (error: any) {
      console.error('API Update Error Details:', {
        message: error.message,
        code: error.code,
        name: error.name,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        } : 'No response',
        request: error.request ? 'Request made but no response' : 'No request made',
        config: {
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL,
          headers: error.config?.headers
        }
      });
      throw error;
    }
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
