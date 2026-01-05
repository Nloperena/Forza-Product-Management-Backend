import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { productApi } from '@/services/api';
import { formatBrandName, formatIndustryName } from '@/utils/formatting';
import { 
  Package, 
  TrendingUp, 
  Calendar, 
  Plus, 
  BarChart3, 
  Eye,
  Users,
  Building2
} from 'lucide-react';
import type { ProductStats, BrandIndustryCounts, Product } from '@/types/product';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [brandCounts, setBrandCounts] = useState<BrandIndustryCounts>({});
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch statistics
        const statsData = await productApi.getStatistics();
        setStats(statsData.metadata);
        setBrandCounts(statsData.brand_industry_counts);
        
        // Fetch recent products
        const products = await productApi.getProducts();
        setRecentProducts(products.slice(0, 6)); // Show 6 most recent
        
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalProducts = stats?.total_products || 0;
  const totalBenefits = stats?.total_benefits || 0;
  const totalBrands = Object.keys(brandCounts).length;
  const totalIndustries = 7; // Fixed number of industries

  return (
    <div className="space-y-8">
      {/* Alpha Preview Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-shrink-0">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg">
                <Package className="h-10 w-10" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-bold text-gray-900">
                  Forza Product Management System
                </h2>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                  Alpha Preview
                </Badge>
              </div>
              <p className="text-gray-700">
                Welcome to the Forza Product Management System alpha test environment. 
                You're currently viewing a live preview of our comprehensive product catalog with read-only access to browse and explore product information.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Overview of your Forza products management system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-blue-600 border-blue-200">
            Read-Only Access
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-3xl font-bold text-gray-900">{totalProducts}</p>
              </div>
              <div className="h-12 w-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Package className="h-6 w-6 text-primary-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>Active catalog</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Benefits</p>
                <p className="text-3xl font-bold text-gray-900">{totalBenefits}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <span>Across all products</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Brands</p>
                <p className="text-3xl font-bold text-gray-900">{totalBrands}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <span>Product lines</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Industries</p>
                <p className="text-3xl font-bold text-gray-900">{totalIndustries}</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <span>Market segments</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Brand Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Brand Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(brandCounts).map(([brand, industries]) => {
              const totalBrandProducts = Object.values(industries).reduce((sum, count) => sum + count, 0);
              
              return (
                <div key={brand} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-sm">
                      {formatBrandName(brand)}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {totalBrandProducts} products across {Object.keys(industries).length} industries
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {Object.entries(industries).map(([industry, count]) => (
                      <Badge key={industry} variant="secondary" className="text-xs">
                        {formatIndustryName(industry)}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Products */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Recent Products
          </CardTitle>
          <Link to="/products">
            <Button variant="outline" size="sm" className="gap-2">
              <Eye className="h-4 w-4" />
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentProducts.map((product) => (
                <div key={product.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 text-sm line-clamp-2">
                      {product.full_name || product.name}
                    </h3>
                    {product.published ? (
                      <Badge variant="success" className="text-xs ml-2">Live</Badge>
                    ) : (
                      <Badge variant="warning" className="text-xs ml-2">Draft</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {formatBrandName(product.brand)}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {formatIndustryName(product.industry)}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    {product.benefits_count} benefits
                  </p>
                  <Link to={`/products/${product.product_id || product.id}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      View Details
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No products found</p>
              <Link to="/products/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First Product
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Info */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Last Updated:</span>
                <span className="ml-2 text-gray-600">{stats.organized_date}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Hierarchy:</span>
                <span className="ml-2 text-gray-600">{stats.hierarchy}</span>
              </div>
              {stats.notes && (
                <div className="md:col-span-2">
                  <span className="font-medium text-gray-700">Notes:</span>
                  <p className="mt-1 text-gray-600">{stats.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
