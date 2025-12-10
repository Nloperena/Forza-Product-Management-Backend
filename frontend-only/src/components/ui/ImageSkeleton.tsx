import React, { useState } from 'react';
import { Package } from 'lucide-react';

interface ImageSkeletonProps {
  src: string;
  alt: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
  fallbackText?: string;
  aspectRatio?: 'square' | 'video' | 'auto';
  objectFit?: 'contain' | 'cover';
  containerClassName?: string;
}

/**
 * Image component with skeleton loading state
 * Shows a pulsing skeleton while the image loads, then transitions to the actual image
 */
const ImageSkeleton: React.FC<ImageSkeletonProps> = ({
  src,
  alt,
  className = '',
  fallbackIcon,
  fallbackText = 'No Image',
  aspectRatio = 'video',
  objectFit = 'contain',
  containerClassName = ''
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoading(false);
    setHasError(true);
    const target = e.target as HTMLImageElement;
    target.src = '/placeholder-product.svg';
  };

  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    auto: ''
  };

  const shouldShowImage = src && src !== '/placeholder-product.svg' && !hasError;

  return (
    <div className={`relative ${aspectClasses[aspectRatio]} ${containerClassName}`}>
      {/* Skeleton Loading State */}
      {isLoading && shouldShowImage && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
          <div className="flex flex-col items-center text-gray-400">
            <Package className="h-8 w-8 animate-pulse" />
            <span className="text-xs mt-2">Loading...</span>
          </div>
        </div>
      )}

      {/* Actual Image */}
      {shouldShowImage ? (
        <img
          src={src}
          alt={alt}
          className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 ${
            objectFit === 'contain' ? 'object-contain' : 'object-cover'
          }`}
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : (
        // Fallback when no image or error
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="flex flex-col items-center text-gray-400">
            {fallbackIcon || <Package className="h-12 w-12 mb-2" />}
            <span className="text-sm">{fallbackText}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageSkeleton;

