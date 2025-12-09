export const formatBrandName = (brand: string): string => {
  return brand
    .replace('forza_', '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const formatIndustryName = (industry: string): string => {
  return industry
    .replace(/_industry/g, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

export const getImageUrl = (imagePath?: string, apiBaseUrl?: string, useRelativePath: boolean = false): string => {
  if (!imagePath) return '/placeholder-product.svg';
  
  // If it's a full URL (Vercel Blob URL or any external URL), return as-is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // Handle different image path formats from the backend
  let normalizedPath = imagePath;
  
  // Handle Product-Mockups paths (new format)
  if (imagePath.startsWith('/images/Product-Mockups/')) {
    // Use as-is - these are served directly from frontend public folder
    normalizedPath = imagePath;
  }
  // Transform /api/images/placeholder/ paths to /product-images/ paths
  else if (imagePath.startsWith('/api/images/placeholder/')) {
    // Extract the filename from the placeholder path
    const filename = imagePath.replace('/api/images/placeholder/', '');
    normalizedPath = `/product-images/${filename}`;
  }
  // If the path already starts with /product-images/, use it as-is
  else if (imagePath.startsWith('/product-images/')) {
    normalizedPath = imagePath;
  }
  // If the path starts with /api/ (but not placeholder), use it as-is
  else if (imagePath.startsWith('/api/')) {
    normalizedPath = imagePath;
  }
  // Otherwise, assume it's a filename and add the product-images path
  else {
    normalizedPath = `/product-images/${imagePath}`;
  }
  
  // If useRelativePath is true, return just the path without the API base URL
  if (useRelativePath) {
    return normalizedPath;
  }
  
  // For Product-Mockups paths, return as relative path (served from frontend)
  if (normalizedPath.startsWith('/images/Product-Mockups/')) {
    return normalizedPath;
  }
  
  // Use provided API base URL or fallback to default
  const API_BASE_URL = apiBaseUrl || 'https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com';
  return `${API_BASE_URL}${normalizedPath}`;
};

// Helper function specifically for product images that handles both types
export const getProductImageUrl = (product: { image?: string }, apiBaseUrl?: string): string => {
  if (!product.image) return '/placeholder-product.svg';
  
  // If image starts with 'http', it's a Vercel Blob URL - use as-is
  if (product.image.startsWith('http')) {
    return product.image;
  }
  
  // Handle Product-Mockups paths (new format) - served directly from frontend
  if (product.image.startsWith('/images/Product-Mockups/')) {
    return product.image;
  }
  
  // Handle different image path formats
  let imagePath = product.image;
  
  // If the path already starts with /product-images/, use it as-is
  if (imagePath.startsWith('/product-images/')) {
    imagePath = imagePath.substring('/product-images/'.length); // Remove the prefix for backend
  }
  // If the path starts with product-images/, remove the prefix
  else if (imagePath.startsWith('product-images/')) {
    imagePath = imagePath.substring('product-images/'.length);
  }
  // If it's just a filename (like "os24.png"), use it as-is
  
  // For backend images, construct the full URL using the API base URL
  const API_BASE_URL = apiBaseUrl || 'https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com';
  const imageUrl = `${API_BASE_URL}/product-images/${imagePath}`;
  return imageUrl;
};

export const getBrandColor = (brand: string): string => {
  const colors = {
    forza_bond: 'bg-blue-500',
    forza_seal: 'bg-green-500',
    forza_tape: 'bg-purple-500',
  };
  
  return colors[brand as keyof typeof colors] || 'bg-gray-500';
};

export const getBrandTextColor = (brand: string): string => {
  const colors = {
    forza_bond: 'text-blue-600',
    forza_seal: 'text-green-600',
    forza_tape: 'text-purple-600',
  };
  
  return colors[brand as keyof typeof colors] || 'text-gray-600';
};
