import type { Product, ProductStats, BrandIndustryCounts } from '@/types/product';
import forzaProductsData from './forza_products_organized.json';

// Interface for the Forza JSON structure
interface ForzaProduct {
  name: string;
  url: string;
  image: string;
  benefits: string[];
  benefits_count: number;
  chemistry: string;
  brand: string;
  industry: string;
  applications: string[];
  technical: Array<{
    property: string;
    value: string;
    unit?: string;
  }>;
  published: boolean;
  product_id: string;
  full_name: string;
  description: string;
  sizing?: string[];
  last_edited?: string;
}

interface ForzaData {
  forza_products_organized: {
    metadata: {
      total_products: number;
      total_benefits: number;
      organized_date: string;
      hierarchy: string;
      notes: string;
    };
    [key: string]: any;
  };
}

// Convert Forza JSON data to our Product interface
function convertForzaToProduct(forzaProduct: ForzaProduct): Product {
  return {
    id: forzaProduct.product_id,
    product_id: forzaProduct.product_id,
    name: forzaProduct.name,
    full_name: forzaProduct.full_name,
    description: forzaProduct.description,
    brand: forzaProduct.brand,
    industry: forzaProduct.industry,
    chemistry: forzaProduct.chemistry,
    url: forzaProduct.url,
    image: forzaProduct.image,
    benefits: forzaProduct.benefits,
    applications: forzaProduct.applications,
    technical: forzaProduct.technical,
    sizing: forzaProduct.sizing,
    published: forzaProduct.published,
    benefits_count: forzaProduct.benefits_count,
    last_edited: forzaProduct.last_edited
  };
}

// Extract all products from the Forza JSON structure
function extractAllProducts(data: ForzaData): Product[] {
  const products: Product[] = [];
  
  // Iterate through all brand categories (forza_bond, forza_seal, forza_tape)
  Object.values(data.forza_products_organized).forEach(brandCategory => {
    if (typeof brandCategory === 'object' && brandCategory !== null && 'products' in brandCategory) {
      const brandData = brandCategory as any;
      
      // Iterate through industry categories within each brand
      Object.values(brandData.products).forEach((industryCategory: any) => {
        if (typeof industryCategory === 'object' && industryCategory !== null && 'products' in industryCategory) {
          const industryData = industryCategory as any;
          
          // Extract products from each industry
          if (Array.isArray(industryData.products)) {
            industryData.products.forEach((product: ForzaProduct) => {
              products.push(convertForzaToProduct(product));
            });
          }
        }
      });
    }
  });
  
  return products;
}

// Generate mock data from Forza products
export const mockProducts: Product[] = extractAllProducts(forzaProductsData as ForzaData);

export const mockStats: ProductStats = {
  total_products: mockProducts.length,
  total_benefits: mockProducts.reduce((sum, product) => sum + product.benefits_count, 0),
  organized_date: (forzaProductsData as ForzaData).forza_products_organized.metadata.organized_date,
  hierarchy: (forzaProductsData as ForzaData).forza_products_organized.metadata.hierarchy,
  notes: (forzaProductsData as ForzaData).forza_products_organized.metadata.notes
};

export const mockBrandIndustryCounts: BrandIndustryCounts = mockProducts.reduce((acc, product) => {
  if (!acc[product.brand]) {
    acc[product.brand] = {};
  }
  if (!acc[product.brand][product.industry]) {
    acc[product.brand][product.industry] = 0;
  }
  acc[product.brand][product.industry]++;
  return acc;
}, {} as BrandIndustryCounts);

export const mockImages = [
  {
    filename: 'placeholder-product.svg',
    path: '/placeholder-product.svg',
    size: 1024
  }
];
