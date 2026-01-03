import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useProduct } from '@/hooks/useProducts';
import { productApi } from '@/services/api';
import { useToast } from '@/components/ui/ToastContainer';
import { useApi } from '@/contexts/ApiContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import ImageSkeleton from '@/components/ui/ImageSkeleton';
import PDFViewer from '@/components/ui/PDFViewer';
import { formatBrandName, formatIndustryName, getImageUrl, getProductImageUrl, getBrandTextColor } from '@/utils/formatting';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  ExternalLink, 
  Package, 
  Calendar,
  Globe,
  Tag,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle
} from 'lucide-react';

const ProductViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { product, loading, error } = useProduct(id || '');
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    if (!product || !id) return;
    
    try {
      setDeleting(true);
      await productApi.deleteProduct(id);
      showSuccess('Product Deleted', `"${product.full_name || product.name}" has been deleted successfully.`);
      navigate('/products');
    } catch (error) {
      console.error('Failed to delete product:', error);
      showError('Delete Failed', 'Failed to delete product. Please try again.');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
          <span className="text-lg text-gray-600">Loading product...</span>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Product Not Found</h2>
        <p className="text-gray-600 mb-6">{error || 'The requested product could not be found.'}</p>
        <Link to="/products">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </Button>
        </Link>
      </div>
    );
  }

  const { apiBaseUrl } = useApi();
  const imageUrl = getProductImageUrl(product, apiBaseUrl);
  const brandColor = getBrandTextColor(product.brand);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/products">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Products
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {product.full_name || product.name}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={`${brandColor}`}>
                {formatBrandName(product.brand)}
              </Badge>
              <Badge variant="secondary">
                {formatIndustryName(product.industry)}
              </Badge>
              {product.published ? (
                <Badge variant="success" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Published
                </Badge>
              ) : (
                <Badge variant="warning" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Draft
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {product.url && (
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-2">
                <Globe className="h-4 w-4" />
                View Online
              </Button>
            </a>
          )}
          <Link to={`/products/${id}/edit`}>
            <Button variant="outline" size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Image */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg">
                <ImageSkeleton
                  src={imageUrl}
                  alt={product.name}
                  className="max-w-full max-h-full"
                  aspectRatio="video"
                  objectFit="contain"
                  fallbackIcon={<Package className="h-16 w-16 mb-4" />}
                  fallbackText="No Image Available"
                  containerClassName="bg-gray-100"
                />
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {product.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Benefits */}
          {product.benefits.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Benefits ({product.benefits.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {product.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                      <span className="text-gray-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Applications */}
          {product.applications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {product.applications.map((application, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <span className="text-gray-700">{application}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Technical Properties */}
          {product.technical.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Technical Properties</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Property</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.technical.map((tech, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-3 px-4 text-gray-700 font-medium">{tech.property}</td>
                          <td className="py-3 px-4 text-gray-600">
                            {tech.value}
                            {tech.unit && <span className="text-gray-500 ml-1">({tech.unit})</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sizing Information */}
          {(() => {
            // Handle both array and object formats for sizing
            let hasSizing = false;
            let sizingEntries: Array<[string, any]> = [];
            
            if (product.sizing) {
              if (Array.isArray(product.sizing)) {
                // Convert array to entries format
                sizingEntries = product.sizing
                  .filter(item => item != null)
                  .map((item, index) => {
                    // If item is an object, convert it to a string representation
                    if (typeof item === 'object') {
                      return [`Item ${index + 1}`, JSON.stringify(item)];
                    }
                    return [`Item ${index + 1}`, String(item)];
                  });
                hasSizing = sizingEntries.length > 0;
              } else if (typeof product.sizing === 'object') {
                sizingEntries = Object.entries(product.sizing)
                  .filter(([key, value]) => value != null)
                  .map(([key, value]) => {
                    // Ensure value is always a string, never an object
                    if (typeof value === 'object') {
                      return [key, JSON.stringify(value)];
                    }
                    return [key, String(value)];
                  });
                hasSizing = sizingEntries.length > 0;
              }
            }
            
            return hasSizing ? (
              <Card>
                <CardHeader>
                  <CardTitle>Sizing Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Sizings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sizingEntries.map(([key, value], index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-3 px-4">
                              <div className="font-medium text-gray-900 capitalize">
                                {key.replace(/_/g, ' ')}
                              </div>
                              <div className="text-gray-600 mt-1">
                                {String(value)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : null;
          })()}

          {/* Packaging Information */}
          {product.packaging && product.packaging.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Packaging Information</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {product.packaging.map((item, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Product Documents */}
          {(product.tds_pdf || product.sds_pdf) && (
            <Card>
              <CardHeader>
                <CardTitle>Product Documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {product.tds_pdf && (
                  <PDFViewer
                    pdfUrl={product.tds_pdf}
                    title={product.full_name || product.name}
                    type="TDS"
                    compact
                  />
                )}
                {product.sds_pdf && (
                  <PDFViewer
                    pdfUrl={product.sds_pdf}
                    title={product.full_name || product.name}
                    type="SDS"
                    compact
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Product Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Product Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Product ID</label>
                <p className="text-gray-900 font-mono">{product.product_id || product.id}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Brand</label>
                <p className="text-gray-900">{formatBrandName(product.brand)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Industry</label>
                <p className="text-gray-900">{formatIndustryName(product.industry)}</p>
              </div>
              
              {product.chemistry && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Chemistry</label>
                  <p className="text-gray-900">{product.chemistry}</p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  {product.published ? (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Published
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      Draft
                    </Badge>
                  )}
                </div>
              </div>

              {product.last_edited && (
                <div>
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Last Edited
                  </label>
                  <p className="text-gray-900">{product.last_edited}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to={`/products/${id}/edit`}>
                <Button className="w-full gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Product
                </Button>
              </Link>
              
              {product.url && (
                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="outline" className="w-full gap-2">
                    <ExternalLink className="h-4 w-4" />
                    View Online
                  </Button>
                </a>
              )}
              
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete Product
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Confirm Deletion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete "{product.full_name || product.name}"? 
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 gap-2"
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {deleting ? 'Deleting...' : 'Delete'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProductViewPage;
