export interface TechnicalProperty {
  property: string;
  value: string;
  unit?: string;
}

export interface Product {
  id: string;
  product_id: string;
  name: string;
  full_name: string;
  description: string;
  brand: string;
  industry: string;
  chemistry?: string;
  url?: string;
  image?: string;
  benefits: string[];
  applications: string[];
  how_to_use?: string[];
  technical: TechnicalProperty[];
  sizing: any;
  packaging?: string[];
  tds_pdf?: string;
  sds_pdf?: string;
  color?: string;
  cleanup?: string;
  recommended_equipment?: string;
  published: boolean;
  benefits_count?: number;
  last_edited?: string;
}

export interface ProductStats {
  total_products: number;
  total_benefits?: number;
  organized_date: string;
  hierarchy: string;
  notes: string;
}

export interface BrandIndustryCounts {
  [brand: string]: {
    [industry: string]: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface ProductFilters {
  brand?: string;
  industry?: string;
  chemistry?: string;
  search?: string;
  published?: boolean;
}

export interface ProductFormData {
  product_id: string;
  name?: string;
  full_name: string;
  description: string;
  brand: string;
  industry: string;
  chemistry: string;
  url: string;
  image: string;
  benefits: string[];
  applications: string[];
  how_to_use?: string[];
  technical: TechnicalProperty[];
  sizing: any;
  packaging?: string[];
  tds_pdf?: string;
  sds_pdf?: string;
  color?: string;
  cleanup?: string;
  recommended_equipment?: string;
  published: boolean;
  last_edited?: string;
}
