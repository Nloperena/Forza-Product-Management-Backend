import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import ImageSkeleton from '@/components/ui/ImageSkeleton';
import { formatBrandName, formatIndustryName, getImageUrl, getProductImageUrl, getBrandTextColor } from '@/utils/formatting';
import { useApi } from '@/contexts/ApiContext';
import { Eye, Edit, ExternalLink, Package } from 'lucide-react';
import type { Product } from '@/types/product';

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onView?: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onEdit, onView }) => {
  const { apiBaseUrl } = useApi();
  const imageUrl = getProductImageUrl(product, apiBaseUrl);
  const brandColor = getBrandTextColor(product.brand);

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">
              {product.name}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={`text-xs ${brandColor}`}>
                {formatBrandName(product.brand)}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {formatIndustryName(product.industry)}
              </Badge>
            </div>
          </div>
          <div className="ml-3 flex-shrink-0">
            {product.published ? (
              <Badge variant="success" className="text-xs">Live</Badge>
            ) : (
              <Badge variant="warning" className="text-xs">Draft</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {/* Product Image */}
        <div className="mb-4 overflow-hidden rounded-lg">
          <ImageSkeleton
            src={imageUrl}
            alt={product.name}
            className="h-full w-full transition-transform duration-200 group-hover:scale-105"
            aspectRatio="video"
            objectFit="contain"
            fallbackIcon={<Package className="h-12 w-12 mb-2" />}
            fallbackText="No Image"
          />
        </div>

        {/* Description */}
        {product.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {product.description}
          </p>
        )}

        {/* Benefits Count */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span>{product.benefits.length} benefits</span>
          {product.url && (
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700"
            >
              <ExternalLink className="h-3 w-3" />
              View Online
            </a>
          )}
        </div>

        {/* Benefits Preview */}
        {product.benefits.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-gray-900">Key Benefits:</h4>
            <ul className="text-xs text-gray-600 space-y-0.5">
              {product.benefits.slice(0, 2).map((benefit, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-1 text-primary-500">•</span>
                  <span className="line-clamp-1">{benefit}</span>
                </li>
              ))}
              {product.benefits.length > 2 && (
                <li className="text-gray-400">
                  +{product.benefits.length - 2} more benefits
                </li>
              )}
            </ul>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t border-gray-100">
        <div className="flex w-full gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => onView?.(product)}
          >
            <Eye className="h-4 w-4" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => onEdit?.(product)}
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
