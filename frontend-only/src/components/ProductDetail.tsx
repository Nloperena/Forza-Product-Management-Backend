import React, { useState, useEffect } from 'react';
import { formatBrandName, formatIndustryName, getProductImageUrl } from '@/utils/formatting';
import { useApi } from '@/contexts/ApiContext';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/components/ui/ToastContainer';
import { productApi } from '@/services/api';
import ImageSkeleton from '@/components/ui/ImageSkeleton';
import ImageUpload from '@/components/ui/ImageUpload';
import { Package, Tag, CheckCircle, XCircle, Save, Edit2, Plus, Trash2, Loader2, Image as ImageIcon, FileText, X, Search, ZoomIn } from 'lucide-react';
import type { Product, ProductFormData, TechnicalProperty } from '@/types/product';

interface ProductDetailProps {
  product: Product;
  onProductUpdated?: (updatedProduct: Product) => void;
  onProductDeleted?: (productId: string) => void;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ product, onProductUpdated, onProductDeleted }) => {
  const { apiBaseUrl } = useApi();
  const { user, isAdmin } = useUser();
  const { showSuccess, showError, showInfo } = useToast();
  
  // Log API base URL and product data for debugging
  React.useEffect(() => {
    console.log('ProductDetail - API Base URL:', apiBaseUrl);
    console.log('ProductDetail - Product JSON:', JSON.stringify(product, null, 2));
    console.log('ProductDetail - Applications:', product.applications);
    console.log('ProductDetail - Benefits:', product.benefits);
  }, [apiBaseUrl, product]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showBlobBrowser, setShowBlobBrowser] = useState(false);
  const [blobImages, setBlobImages] = useState<Array<{url: string; pathname: string}>>([]);
  const [blobFolders, setBlobFolders] = useState<string[]>([]);
  const [blobCurrentPath, setBlobCurrentPath] = useState('');
  const [blobSearchTerm, setBlobSearchTerm] = useState('');
  const [loadingBlobs, setLoadingBlobs] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const productId = product.product_id || product.id;
      console.log('Deleting product:', productId);
      
      const result = await productApi.deleteProduct(productId);
      console.log('Delete result:', result);
      
      showSuccess('Product Deleted', `"${product.name}" has been removed successfully.`);
      setShowDeleteConfirm(false);
      
      if (onProductDeleted) {
        onProductDeleted(productId);
      }
    } catch (error: any) {
      console.error('Failed to delete product:', error);
      showError('Delete Failed', error.message || 'Failed to delete product. Please try again.');
    } finally {
      setDeleting(false);
    }
  };
  // Helper function to ensure technical is always an array
  const normalizeTechnical = (technical: any): any[] => {
    if (!technical) return [];
    if (Array.isArray(technical)) return technical;
    // If it's an object, try to convert it to an array
    if (typeof technical === 'object') {
      // If it looks like a single technical property object
      if (technical.property || technical.value) {
        return [technical];
      }
      // Otherwise return empty array
      return [];
    }
    return [];
  };

  // Helper function to normalize sizing to always be an array
  const normalizeSizing = (sizing: any): string[] => {
    if (!sizing) return [];
    if (Array.isArray(sizing)) {
      // Ensure all items are strings
      return sizing.filter(item => typeof item === 'string');
    }
    if (typeof sizing === 'object') {
      // Convert object to array of string values
      return Object.values(sizing).filter(v => typeof v === 'string') as string[];
    }
    return [];
  };

  const [formData, setFormData] = useState<ProductFormData>({
    product_id: product.product_id,
    name: product.name,
    full_name: product.full_name || product.name,
    description: product.description || '',
    url: product.url || '',
    brand: product.brand,
    industry: product.industry,
    chemistry: product.chemistry || '',
    image: product.image || '',
    published: product.published,
    benefits: Array.isArray(product.benefits) ? product.benefits : [],
    applications: Array.isArray(product.applications) ? product.applications : [],
    technical: normalizeTechnical(product.technical),
    sizing: normalizeSizing(product.sizing),
    color: product.color || '',
    cleanup: product.cleanup || '',
    recommended_equipment: product.recommended_equipment || '',
  });

  const imageUrl = getProductImageUrl(product, apiBaseUrl);

  // Update form data when product changes
  useEffect(() => {
    setFormData({
      product_id: product.product_id,
      name: product.name,
      full_name: product.full_name || product.name,
      description: product.description || '',
      url: product.url || '',
      brand: product.brand,
      industry: product.industry,
      chemistry: product.chemistry || '',
      image: product.image || '',
      published: product.published,
      benefits: Array.isArray(product.benefits) ? product.benefits : [],
      applications: Array.isArray(product.applications) ? product.applications : [],
      technical: normalizeTechnical(product.technical),
      sizing: normalizeSizing(product.sizing),
      color: product.color || '',
      cleanup: product.cleanup || '',
      recommended_equipment: product.recommended_equipment || '',
    });
    setIsEditing(false);
  }, [product.product_id]);

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayItemAdd = (field: 'benefits' | 'applications' | 'sizing') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const handleArrayItemRemove = (field: 'benefits' | 'applications' | 'sizing', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleTechnicalAdd = () => {
    setFormData(prev => ({
      ...prev,
      technical: [...prev.technical, { property: '', value: '', unit: '' }]
    }));
  };

  const handleTechnicalRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      technical: prev.technical.filter((_, i) => i !== index)
    }));
  };

  // Fetch all images from Vercel Blob
  const fetchBlobImages = async (prefix: string = '') => {
    setLoadingBlobs(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/images?prefix=${encodeURIComponent(prefix)}`);
      const data = await response.json();
      if (data.success) {
        setBlobImages(data.images || []);
        setBlobFolders(data.folders || []);
        setBlobCurrentPath(data.currentPath || '');
      }
    } catch (error) {
      console.error('Failed to fetch blob images:', error);
    } finally {
      setLoadingBlobs(false);
    }
  };

  // Navigate into a folder
  const navigateToFolder = (folderName: string) => {
    const newPath = blobCurrentPath ? `${blobCurrentPath}${folderName}/` : `${folderName}/`;
    fetchBlobImages(newPath);
  };

  // Navigate up one level
  const navigateUp = () => {
    const parts = blobCurrentPath.split('/').filter(p => p);
    parts.pop();
    const newPath = parts.length > 0 ? `${parts.join('/')}/` : '';
    fetchBlobImages(newPath);
  };

  // Get breadcrumb parts
  const breadcrumbs = blobCurrentPath.split('/').filter(p => p);

  // Filter blobs by search term
  const filteredBlobs = blobImages.filter(blob => 
    blob.pathname.toLowerCase().includes(blobSearchTerm.toLowerCase())
  );
  
  const filteredFolders = blobFolders.filter(folder =>
    folder.toLowerCase().includes(blobSearchTerm.toLowerCase())
  );

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log('Saving product:', { 
        id: product.id, 
        product_id: product.product_id,
        formData,
        apiBaseUrl
      });
      
      // Test connection first with a simple GET request to wake up Heroku
      try {
        console.log('Testing API connection...');
        await productApi.getProduct(product.product_id || product.id);
        console.log('API connection test successful');
      } catch (testError: any) {
        console.warn('API connection test failed, but continuing with save:', testError);
      }
      
      // Filter out empty items before saving
      const cleanedFormData = {
        ...formData,
        benefits: formData.benefits.filter(b => b.trim() !== ''),
        applications: formData.applications.filter(a => a.trim() !== ''),
        technical: formData.technical.filter(t => t.property.trim() !== '' && t.value.trim() !== ''),
      };
      
      // Remove product_id from updates (backend doesn't allow updating it)
      const { product_id, ...updateData } = cleanedFormData;
      
      // Add user tracking - who made this change
      if (user) {
        updateData.last_edited = `${user.name} - ${new Date().toLocaleString()}`;
      }
      
      // Try using product_id first (more reliable), fallback to id
      const updateId = product.product_id || product.id;
      console.log('Using update ID:', updateId);
      console.log('Update data:', updateData);
      
      const result = await productApi.updateProduct(updateId, updateData);
      console.log('Save result:', result);
      
      showSuccess('Product Updated', `"${formData.name}" has been saved successfully!`);
      setIsEditing(false);
      
      // Refresh product data
      if (onProductUpdated) {
        const refreshId = product.product_id || product.id;
        const updatedProduct = await productApi.getProduct(refreshId);
        onProductUpdated(updatedProduct);
      }
    } catch (error: any) {
      console.error('Failed to save product:', error);
      
      let errorMessage = 'Failed to save product. Please try again.';
      let errorTitle = 'Save Failed';
      
      if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error') || error?.code === 'ERR_INTERNET_DISCONNECTED') {
        errorTitle = 'Network Error';
        errorMessage = `Unable to connect to Heroku server (${apiBaseUrl}). This could be because:
        
• The Heroku app is starting up (wait 30-60 seconds and try again)
• Your internet connection is down
• The server is temporarily unavailable

Check the browser console (F12) for more details.`;
      } else if (error?.response?.status === 403) {
        errorTitle = 'Access Denied';
        errorMessage = 'CORS error: The server may not allow requests from this origin. Check browser console for details.';
      } else if (error?.response?.status === 404) {
        errorTitle = 'Product Not Found';
        errorMessage = 'The product may have been deleted or the ID is incorrect.';
      } else if (error?.response?.status === 500) {
        errorTitle = 'Server Error';
        errorMessage = error?.response?.data?.message || 'The server encountered an error. Check console for details.';
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      showError(errorTitle, errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const brands = [
    { value: 'forza_bond', label: 'Bond' },
    { value: 'forza_seal', label: 'Seal' },
    { value: 'forza_tape', label: 'Tape' },
  ];

  const industries = [
    { value: 'industrial_industry', label: 'Industrial' },
    { value: 'construction_industry', label: 'Construction' },
    { value: 'marine_industry', label: 'Marine' },
    { value: 'transportation_industry', label: 'Transportation' },
    { value: 'composites_industry', label: 'Composites' },
    { value: 'insulation_industry', label: 'Insulation' },
  ];

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header with Edit/Save Button */}
        <div className={`mb-8 rounded-lg p-6 shadow-sm ${isEditing ? 'bg-blue-50 border-2 border-blue-300' : 'bg-white'}`}>
          {isEditing && (
            <div className="mb-4 px-4 py-2 bg-blue-100 border border-blue-300 rounded-lg">
              <p className="text-blue-800 font-medium text-lg">✏️ Edit Mode - Make your changes and click "Save Changes"</p>
            </div>
          )}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full text-4xl font-bold text-gray-900 mb-4 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  {product.name}
                </h1>
              )}
              <div className="flex flex-wrap items-center gap-3">
                {isEditing ? (
                  <>
                    <select
                      value={formData.brand}
                      onChange={(e) => handleInputChange('brand', e.target.value)}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {brands.map(b => (
                        <option key={b.value} value={b.value}>{b.label}</option>
                      ))}
                    </select>
                    <select
                      value={formData.industry}
                      onChange={(e) => handleInputChange('industry', e.target.value)}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {industries.map(i => (
                        <option key={i.value} value={i.value}>{i.label}</option>
                      ))}
                    </select>
                  </>
                ) : (
                  <>
                    {product.last_edited && (
                      <span className="inline-flex items-center px-3 py-1 rounded-lg bg-gray-100 text-gray-600 text-sm">
                        Last edited: {product.last_edited}
                      </span>
                    )}
                    <span className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-100 text-blue-800 text-lg font-medium">
                      {formatBrandName(product.brand)}
                    </span>
                    <span className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-100 text-gray-800 text-lg font-medium">
                      {formatIndustryName(product.industry)}
                    </span>
                  </>
                )}
                {isEditing ? (
                  <label className="flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.published}
                      onChange={(e) => handleInputChange('published', e.target.checked)}
                      className="w-5 h-5"
                    />
                    <span className="text-lg font-medium">Published</span>
                  </label>
                ) : (
                  product.published ? (
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 text-green-800 text-lg font-medium">
                      <CheckCircle className="h-5 w-5" />
                      Published
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-100 text-yellow-800 text-lg font-medium">
                      <XCircle className="h-5 w-5" />
                      Draft
                    </span>
                  )
                )}
              </div>
            </div>
            <div className="ml-4 flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => {
                      console.log('Cancel button clicked, exiting edit mode');
                      setIsEditing(false);
                      // Reset form data to original product data
                      setFormData({
                        product_id: product.product_id,
                        name: product.name,
                        full_name: product.full_name || product.name,
                        description: product.description || '',
                        url: product.url || '',
                        brand: product.brand,
                        industry: product.industry,
                        chemistry: product.chemistry || '',
                        image: product.image || '',
                        published: product.published,
                        benefits: Array.isArray(product.benefits) ? product.benefits : [],
                        applications: Array.isArray(product.applications) ? product.applications : [],
                        technical: normalizeTechnical(product.technical),
                        sizing: normalizeSizing(product.sizing),
                        color: product.color || '',
                        cleanup: product.cleanup || '',
                        recommended_equipment: product.recommended_equipment || '',
                      });
                    }}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium transition-colors"
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-medium transition-colors"
                    type="button"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        Save Changes
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="flex gap-2">
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => {
                          console.log('Edit button clicked, setting isEditing to true');
                          setIsEditing(true);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-lg font-medium transition-colors cursor-pointer"
                        type="button"
                      >
                        <Edit2 className="h-5 w-5" />
                        Edit
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 text-lg font-medium transition-colors cursor-pointer"
                        type="button"
                      >
                        <Trash2 className="h-5 w-5" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Delete Confirmation Modal/Overlay */}
          {showDeleteConfirm && (
            <div className="mt-6 p-6 bg-red-50 border-2 border-red-200 rounded-xl animate-in fade-in zoom-in duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-100 p-2 rounded-full">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-red-900">Confirm Product Deletion</h3>
              </div>
              <p className="text-red-800 text-lg mb-6">
                Are you absolutely sure you want to delete <span className="font-bold">"{product.name}"</span>? 
                This action cannot be undone and the product will be permanently removed from the database.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-lg font-medium transition-colors disabled:opacity-50"
                >
                  No, Keep Product
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-lg font-medium transition-colors disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-5 w-5" />
                      Yes, Delete Permanently
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Product Assets (Images & Documents) */}
        <div className="mb-8 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-6 w-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">Product Assets</h2>
            </div>
            {isEditing && (
              <button
                onClick={() => { setShowBlobBrowser(true); fetchBlobImages(); }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
              >
                <Search className="h-4 w-4" />
                Browse Vercel Blob
              </button>
            )}
          </div>
          
          {/* Main Product Image - Large and Prominent */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              Product Image
            </label>
            {isEditing ? (
              <div className="space-y-4">
                <ImageUpload
                  productId={formData.product_id}
                  type="image"
                  onImageUpload={(url) => handleInputChange('image', url)}
                  currentImage={formData.image ? imageUrl : undefined}
                />
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-gray-400 uppercase">Manual URL</label>
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => handleInputChange('image', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 font-mono"
                    placeholder="https://..."
                  />
                </div>
              </div>
            ) : (
              <div 
                className="relative group cursor-zoom-in"
                onClick={() => setShowLightbox(true)}
              >
                <ImageSkeleton
                  src={imageUrl}
                  alt={product.name}
                  className="w-full max-h-[500px] rounded-xl"
                  aspectRatio="video"
                  objectFit="contain"
                  containerClassName="bg-gradient-to-b from-gray-50 to-gray-100 border border-gray-100 rounded-xl overflow-hidden"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all rounded-xl flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                    <ZoomIn className="h-5 w-5 text-gray-700" />
                    <span className="text-sm font-medium text-gray-700">Click to enlarge</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* TDS & SDS in a Row Below */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
            {/* TDS */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                <FileText className="h-4 w-4 text-blue-500" />
                Technical Data Sheet (TDS)
              </label>
              {isEditing ? (
                <div className="space-y-3">
                  <ImageUpload
                    productId={formData.product_id}
                    type="tds"
                    onImageUpload={(url) => handleInputChange('tds_pdf', url)}
                    currentImage={formData.tds_pdf ? '/pdf-icon.svg' : undefined}
                  />
                  <input
                    type="text"
                    value={formData.tds_pdf || ''}
                    onChange={(e) => handleInputChange('tds_pdf', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 font-mono"
                    placeholder="TDS link..."
                  />
                </div>
              ) : (
                <div className="h-32 flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  {product.tds_pdf ? (
                    <a href={product.tds_pdf} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 group hover:scale-105 transition-transform">
                      <div className="p-3 bg-white rounded-full shadow-md group-hover:shadow-lg transition-all">
                        <FileText className="h-8 w-8 text-blue-600" />
                      </div>
                      <span className="text-sm font-semibold text-blue-700">View TDS</span>
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm">No TDS attached</span>
                  )}
                </div>
              )}
            </div>

            {/* SDS */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                <FileText className="h-4 w-4 text-red-500" />
                Safety Data Sheet (SDS)
              </label>
              {isEditing ? (
                <div className="space-y-3">
                  <ImageUpload
                    productId={formData.product_id}
                    type="sds"
                    onImageUpload={(url) => handleInputChange('sds_pdf', url)}
                    currentImage={formData.sds_pdf ? '/pdf-icon.svg' : undefined}
                  />
                  <input
                    type="text"
                    value={formData.sds_pdf || ''}
                    onChange={(e) => handleInputChange('sds_pdf', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 font-mono"
                    placeholder="SDS link..."
                  />
                </div>
              ) : (
                <div className="h-32 flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-100">
                  {product.sds_pdf ? (
                    <a href={product.sds_pdf} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 group hover:scale-105 transition-transform">
                      <div className="p-3 bg-white rounded-full shadow-md group-hover:shadow-lg transition-all">
                        <FileText className="h-8 w-8 text-red-600" />
                      </div>
                      <span className="text-sm font-semibold text-red-700">View SDS</span>
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm">No SDS attached</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Image Lightbox Modal */}
        {showLightbox && (
          <div 
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setShowLightbox(false)}
          >
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="h-8 w-8 text-white" />
            </button>
            <img 
              src={imageUrl} 
              alt={product.name}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-6 py-2 rounded-full">
              <p className="text-white text-sm font-medium">{product.name}</p>
            </div>
          </div>
        )}

        {/* Vercel Blob Browser Modal */}
        {showBlobBrowser && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Vercel Blob Browser</h3>
                  <p className="text-sm text-gray-500 mt-1">Navigate folders and select from your existing images</p>
                </div>
                <button
                  onClick={() => { setShowBlobBrowser(false); setBlobCurrentPath(''); setBlobSearchTerm(''); }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              
              {/* Breadcrumbs */}
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2 text-sm overflow-x-auto">
                <button
                  onClick={() => fetchBlobImages('')}
                  className="text-blue-600 hover:text-blue-800 font-medium flex-shrink-0"
                >
                  🏠 Root
                </button>
                {breadcrumbs.map((crumb, index) => (
                  <span key={index} className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-gray-400">/</span>
                    <button
                      onClick={() => {
                        const path = breadcrumbs.slice(0, index + 1).join('/') + '/';
                        fetchBlobImages(path);
                      }}
                      className={index === breadcrumbs.length - 1 
                        ? "text-gray-900 font-semibold" 
                        : "text-blue-600 hover:text-blue-800"
                      }
                    >
                      {crumb}
                    </button>
                  </span>
                ))}
              </div>
              
              {/* Search */}
              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={blobSearchTerm}
                    onChange={(e) => setBlobSearchTerm(e.target.value)}
                    placeholder="Filter by filename..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {filteredFolders.length} folders, {filteredBlobs.length} images
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {loadingBlobs ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Folders Section */}
                    {filteredFolders.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Folders</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          {filteredFolders.map((folder, index) => (
                            <button
                              key={index}
                              onClick={() => navigateToFolder(folder)}
                              className="group flex flex-col items-center gap-2 p-4 bg-gradient-to-b from-amber-50 to-orange-50 border border-amber-200 rounded-xl hover:border-amber-400 hover:shadow-md transition-all"
                            >
                              <span className="text-4xl">📁</span>
                              <span className="text-sm font-medium text-gray-700 truncate w-full text-center">
                                {folder}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Images Section */}
                    {filteredBlobs.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Images</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          {filteredBlobs.map((blob, index) => (
                            <button
                              key={index}
                              onClick={() => {
                                handleInputChange('image', blob.url);
                                setShowBlobBrowser(false);
                                setBlobCurrentPath('');
                                setBlobSearchTerm('');
                              }}
                              className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all"
                            >
                              <img 
                                src={blob.url} 
                                alt={blob.pathname}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                onError={(e) => (e.currentTarget.src = '/placeholder-product.svg')}
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                <p className="text-white text-[10px] truncate font-medium">
                                  {blob.pathname.split('/').pop()}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Empty State */}
                    {filteredFolders.length === 0 && filteredBlobs.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        {blobSearchTerm ? 'No items match your search' : 'This folder is empty'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Product ID */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-600">Product ID</span>
          </div>
          {isEditing ? (
            <input
              type="text"
              value={formData.product_id}
              onChange={(e) => handleInputChange('product_id', e.target.value)}
              className="w-full text-2xl font-mono text-gray-900 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            />
          ) : (
            <p className="text-2xl font-mono text-gray-900">{product.product_id}</p>
          )}
        </div>

        {/* Full Name (for product cards) */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-600">Full Name (for product cards)</span>
          </div>
          {isEditing ? (
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              className="w-full text-xl text-gray-900 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter full product name (used on product cards)"
              disabled={saving}
            />
          ) : (
            <p className="text-xl text-gray-900">{product.full_name || product.name}</p>
          )}
        </div>

        {/* Description */}
        <section className="mb-8 bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
          {isEditing ? (
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              disabled={saving}
            />
          ) : (
            <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-wrap">
              {product.description || 'No description available'}
            </p>
          )}
        </section>

        {/* Chemistry */}
        {isEditing || product.chemistry ? (
          <section className="mb-8 bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Chemistry</h2>
            {isEditing ? (
              <select
                value={formData.chemistry}
                onChange={(e) => handleInputChange('chemistry', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              >
                <option value="">Select Chemistry</option>
                <option value="Acrylic">Acrylic</option>
                <option value="Epoxy">Epoxy</option>
                <option value="Modified Epoxy">Modified Epoxy</option>
                <option value="Cyanoacrylates">Cyanoacrylates</option>
                <option value="Hot Melt">Hot Melt</option>
                <option value="Methacrylate">Methacrylate</option>
                <option value="MS">MS</option>
                <option value="Polyurethane">Polyurethane</option>
                <option value="Silicone">Silicone</option>
                <option value="Solvent Based">Solvent Based</option>
                <option value="Water Based">Water Based</option>
              </select>
            ) : (
              <p className="text-lg text-gray-700">{product.chemistry}</p>
            )}
          </section>
        ) : null}

        {/* Color, Cleanup, Recommended Equipment */}
        <section className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Color</h2>
            {isEditing ? (
              <input
                type="text"
                value={formData.color}
                onChange={(e) => handleInputChange('color', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                placeholder="e.g. Amber, Clear"
              />
            ) : (
              <p className="text-lg text-gray-700">{product.color || 'Not specified'}</p>
            )}
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Cleanup</h2>
            {isEditing ? (
              <input
                type="text"
                value={formData.cleanup}
                onChange={(e) => handleInputChange('cleanup', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                placeholder="Cleanup details"
              />
            ) : (
              <p className="text-lg text-gray-700">{product.cleanup || 'Not specified'}</p>
            )}
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Equipment</h2>
            {isEditing ? (
              <input
                type="text"
                value={formData.recommended_equipment}
                onChange={(e) => handleInputChange('recommended_equipment', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                placeholder="Recommended equipment"
              />
            ) : (
              <p className="text-lg text-gray-700">{product.recommended_equipment || 'Not specified'}</p>
            )}
          </div>
        </section>

        {/* Sizing */}
        <section className="mb-8 bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Sizing</h2>
          {isEditing ? (
            <div className="space-y-3">
              {formData.sizing.map((size, index) => (
                <div key={index} className="flex items-start gap-3">
                  <input
                    type="text"
                    value={size}
                    onChange={(e) => {
                      const newSizing = [...formData.sizing];
                      newSizing[index] = e.target.value;
                      handleInputChange('sizing', newSizing);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                  />
                  <button
                    onClick={() => handleArrayItemRemove('sizing', index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => handleArrayItemAdd('sizing')}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <Plus className="h-5 w-5" />
                Add Size
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(() => {
                // Handle both array and object formats for sizing
                let sizingArray: string[] = [];
                if (Array.isArray(product.sizing)) {
                  sizingArray = product.sizing;
                } else if (product.sizing && typeof product.sizing === 'object') {
                  // Convert object to array of string values
                  sizingArray = Object.values(product.sizing).filter(v => typeof v === 'string') as string[];
                }
                
                return sizingArray.length > 0 ? (
                  sizingArray.map((size, index) => (
                    <span key={index} className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg text-lg">
                      {String(size)}
                    </span>
                  ))
                ) : (
                  <p className="text-lg text-gray-500 italic">No sizing information</p>
                );
              })()}
            </div>
          )}
        </section>

        {/* Benefits */}
        <section className="mb-8 bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Benefits ({formData.benefits.length})
            </h2>
          </div>
          {isEditing ? (
            <div className="space-y-3">
              {formData.benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <input
                    type="text"
                    value={benefit}
                    onChange={(e) => {
                      const newBenefits = [...formData.benefits];
                      newBenefits[index] = e.target.value;
                      handleInputChange('benefits', newBenefits);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                  />
                  <button
                    onClick={() => handleArrayItemRemove('benefits', index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => handleArrayItemAdd('benefits')}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <Plus className="h-5 w-5" />
                Add Benefit
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {product.benefits?.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-3 h-3 bg-blue-500 rounded-full mt-2.5"></div>
                  <p className="text-lg text-gray-700 flex-1">{benefit}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Applications */}
        <section className="mb-8 bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Applications</h2>
          {isEditing ? (
            <div className="space-y-3">
              {formData.applications.map((application, index) => (
                <div key={index} className="flex items-start gap-3">
                  <input
                    type="text"
                    value={application}
                    onChange={(e) => {
                      const newApplications = [...formData.applications];
                      newApplications[index] = e.target.value;
                      handleInputChange('applications', newApplications);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                  />
                  <button
                    onClick={() => handleArrayItemRemove('applications', index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => handleArrayItemAdd('applications')}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <Plus className="h-5 w-5" />
                Add Application
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {product.applications?.map((application, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-3 h-3 bg-green-500 rounded-full mt-2.5"></div>
                  <p className="text-lg text-gray-700 flex-1">{application}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Technical Properties */}
        {isEditing || (Array.isArray(product.technical) && product.technical.length > 0) ? (
          <section className="mb-8 bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Technical Properties</h2>
            {isEditing ? (
              <div className="space-y-3">
                {formData.technical.map((tech, index) => (
                  <div key={index} className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Property"
                      value={tech.property}
                      onChange={(e) => {
                        const newTechnical = [...formData.technical];
                        newTechnical[index] = { ...tech, property: e.target.value };
                        handleInputChange('technical', newTechnical);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      value={tech.value}
                      onChange={(e) => {
                        const newTechnical = [...formData.technical];
                        newTechnical[index] = { ...tech, value: e.target.value };
                        handleInputChange('technical', newTechnical);
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                    />
                    <input
                      type="text"
                      placeholder="Unit (optional)"
                      value={tech.unit || ''}
                      onChange={(e) => {
                        const newTechnical = [...formData.technical];
                        newTechnical[index] = { ...tech, unit: e.target.value };
                        handleInputChange('technical', newTechnical);
                      }}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                    />
                    <button
                      onClick={() => handleTechnicalRemove(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleTechnicalAdd}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Plus className="h-5 w-5" />
                  Add Technical Property
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900 text-lg">Property</th>
                      <th className="text-left py-4 px-6 font-semibold text-gray-900 text-lg">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(Array.isArray(product.technical) ? product.technical : []).map((tech, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="py-4 px-6 text-lg font-medium text-gray-700">{tech.property}</td>
                        <td className="py-4 px-6 text-lg text-gray-600">
                          {tech.value}
                          {tech.unit && <span className="text-gray-500 ml-2">({tech.unit})</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        {/* Product URL */}
        {isEditing || product.url ? (
          <section className="mb-8 bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Link</h2>
            {isEditing ? (
              <input
                type="url"
                value={formData.url}
                onChange={(e) => handleInputChange('url', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                placeholder="https://..."
              />
            ) : (
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-lg text-blue-600 hover:text-blue-800 underline break-all"
              >
                {product.url}
              </a>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
};

export default ProductDetail;