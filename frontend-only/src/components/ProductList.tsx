import React, { useState, useMemo } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useApi } from '@/contexts/ApiContext';
import { Search, Package, Loader2, X, Plus } from 'lucide-react';
import { formatBrandName, formatIndustryName, getProductImageUrl } from '@/utils/formatting';
import ImageSkeleton from '@/components/ui/ImageSkeleton';
import { useUser } from '@/contexts/UserContext';
import type { Product } from '@/types/product';

interface ProductListProps {
  onSelectProduct: (product: Product) => void;
  selectedProduct: Product | null;
  onNewProduct?: () => void;
}

const ProductList: React.FC<ProductListProps> = ({ onSelectProduct, selectedProduct, onNewProduct }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const { products: allProducts, loading, error } = useProducts({ published: true });
  const { apiBaseUrl } = useApi();
  const { isAdmin } = useUser();

  // Get unique brands and industries for filters
  const brands = useMemo(() => {
    const uniqueBrands = Array.from(new Set(allProducts.map(p => p.brand)));
    return uniqueBrands.sort();
  }, [allProducts]);

  const industries = useMemo(() => {
    const uniqueIndustries = Array.from(new Set(allProducts.map(p => p.industry)));
    return uniqueIndustries.sort();
  }, [allProducts]);

  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    let filtered = allProducts;

    // Filter by brand
    if (selectedBrand) {
      filtered = filtered.filter(p => p.brand === selectedBrand);
    }

    // Filter by industry
    if (selectedIndustry) {
      filtered = filtered.filter(p => p.industry === selectedIndustry);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product => {
        const searchableText = [
          product.name,
          product.product_id,
          product.description,
          ...product.benefits,
        ].join(' ').toLowerCase();
        
        return searchableText.includes(term);
      });
    }

    return filtered;
  }, [allProducts, searchTerm, selectedBrand, selectedIndustry]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedBrand('');
    setSelectedIndustry('');
  };

  const hasActiveFilters = selectedBrand || selectedIndustry || searchTerm;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600 text-lg">Loading products...</p>
        </div>
      </div>
    );
  }

  // Only show error if we have no products AND there's an error
  // If products loaded successfully, don't show error even if a subsequent request fails
  if (error && allProducts.length === 0 && !loading) {
    const isNetworkError = error.includes('Network') || error.includes('Failed to fetch') || error.includes('ECONNABORTED');
    
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium mb-2 text-lg">Connection Error</p>
          {isNetworkError ? (
            <div className="space-y-2">
              <p className="text-red-600 text-sm">
                Unable to connect to the Heroku server. This could be because:
              </p>
              <ul className="text-red-600 text-sm list-disc list-inside space-y-1 ml-2">
                <li>The Heroku app is starting up (wait 30 seconds and refresh)</li>
                <li>Your internet connection is down</li>
                <li>The API server is temporarily unavailable</li>
              </ul>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <p className="text-red-600 text-sm">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category Filters */}
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Brands</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {formatBrandName(brand)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Industries</option>
              {industries.map((industry) => (
                <option key={industry} value={industry}>
                  {formatIndustryName(industry)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4" />
            Clear Filters
          </button>
        )}

        {/* Add New Product Button */}
        {isAdmin && (
          <button
            onClick={() => {
              if (onNewProduct) {
                onNewProduct();
              } else {
                window.location.href = '/products/new';
              }
            }}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="h-4 w-4" />
            Add New Product
          </button>
        )}

        <p className="text-sm text-gray-500 mt-3">
          {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto">
        {filteredProducts.length === 0 ? (
          <div className="p-6 text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 text-lg">No products found</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredProducts.map((product) => {
              const isSelected = selectedProduct?.product_id === product.product_id;
              return (
                <button
                  key={product.product_id}
                  onClick={() => onSelectProduct(product)}
                  className={`
                    w-full text-left p-4 hover:bg-blue-50 transition-colors
                    ${isSelected ? 'bg-blue-100 border-l-4 border-blue-600' : ''}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                      <ImageSkeleton
                        src={getProductImageUrl(product, apiBaseUrl)}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        aspectRatio="square"
                        objectFit="cover"
                        fallbackIcon={<Package className="h-6 w-6 text-gray-400" />}
                        fallbackText=""
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`
                        font-semibold text-lg mb-1 truncate
                        ${isSelected ? 'text-blue-900' : 'text-gray-900'}
                      `}>
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">
                        ID: {product.product_id}
                      </p>
                      {product.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductList;