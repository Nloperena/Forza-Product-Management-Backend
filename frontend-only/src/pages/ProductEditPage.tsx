import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useProduct } from '@/hooks/useProducts';
import { productApi } from '@/services/api';
import { useToast } from '@/components/ui/ToastContainer';
import { useApi } from '@/contexts/ApiContext';
import { useUser } from '@/contexts/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getImageUrl, getProductImageUrl } from '@/utils/formatting';
import ImageUpload from '@/components/ui/ImageUpload';
import ImageSkeleton from '@/components/ui/ImageSkeleton';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  Upload,
  Package,
  Loader2,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';
import type { ProductFormData } from '@/types/product';

const ProductEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { apiBaseUrl } = useApi();
  const { user } = useUser();
  const isNewProduct = id === 'new';
  const { product, loading, error } = useProduct(isNewProduct ? '' : id || '');
  
  const [formData, setFormData] = useState<ProductFormData>({
    product_id: '',
    full_name: '',
    description: '',
    url: '',
    brand: 'forza_bond',
    industry: 'industrial_industry',
    chemistry: '',
    image: '',
    published: false,
    benefits: [],
    applications: [],
    technical: [],
    sizing: {},
    packaging: [],
    tds_pdf: '',
    sds_pdf: '',
  });

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [availableImages, setAvailableImages] = useState<Array<{ filename: string; path: string }>>([]);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Brand and industry options
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

  // Load product data when component mounts
  useEffect(() => {
    if (!isNewProduct && product) {
      const productId = product.product_id || product.id || id || '';
      console.log('🔍 ProductEditPage Debug:');
      console.log('  URL id:', id);
      console.log('  product.product_id:', product.product_id);
      console.log('  product.id:', product.id);
      console.log('  Final productId:', productId);
      
      setFormData({
        product_id: productId,
        full_name: product.full_name || product.name,
        description: product.description || '',
        url: product.url || '',
        brand: product.brand,
        industry: product.industry,
        chemistry: product.chemistry || '',
        image: product.image || '',
        published: product.published,
        benefits: [...product.benefits],
        applications: [...product.applications],
        technical: [...product.technical],
        sizing: product.sizing ? { ...product.sizing } : {},
        packaging: product.packaging ? [...product.packaging] : [],
        tds_pdf: product.tds_pdf || '',
        sds_pdf: product.sds_pdf || '',
      });
    }
  }, [product, isNewProduct, id]);

  // Load available images
  useEffect(() => {
    const loadImages = async () => {
      try {
        const images = await productApi.getImages();
        setAvailableImages(images);
      } catch (error) {
        console.error('Failed to load images:', error);
      }
    };
    loadImages();
  }, []);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.product_id.trim()) {
      errors.product_id = 'Product ID is required';
    }

    if (!formData.full_name.trim()) {
      errors.full_name = 'Product name is required';
    }

    if (!formData.brand) {
      errors.brand = 'Brand is required';
    }

    if (!formData.industry) {
      errors.industry = 'Industry is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleArrayAdd = (field: 'benefits' | 'applications') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const handleArrayUpdate = (field: 'benefits' | 'applications', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const handleArrayRemove = (field: 'benefits' | 'applications', index: number) => {
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

  const handleTechnicalUpdate = (index: number, field: 'property' | 'value' | 'unit', value: string) => {
    setFormData(prev => ({
      ...prev,
      technical: prev.technical.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleTechnicalRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      technical: prev.technical.filter((_, i) => i !== index)
    }));
  };

  const handlePackagingAdd = () => {
    setFormData(prev => ({
      ...prev,
      packaging: [...prev.packaging, '']
    }));
  };

  const handlePackagingUpdate = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      packaging: prev.packaging.map((item, i) => i === index ? value : item)
    }));
  };

  const handlePackagingRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      packaging: prev.packaging.filter((_, i) => i !== index)
    }));
  };

  const handleSizingUpdate = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      sizing: {
        ...prev.sizing,
        [key]: value
      }
    }));
  };

  const handleSizingRemove = (key: string) => {
    setFormData(prev => {
      const newSizing = { ...prev.sizing };
      delete newSizing[key];
      return {
        ...prev,
        sizing: newSizing
      };
    });
  };

  const handleSizingAdd = () => {
    const newKey = `dimension_${Object.keys(formData.sizing || {}).length + 1}`;
    setFormData(prev => ({
      ...prev,
      sizing: {
        ...prev.sizing,
        [newKey]: ''
      }
    }));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const result = await productApi.uploadImage(file);
      if (result.success && result.filename) {
        handleInputChange('image', result.filename);
        // Refresh available images
        const images = await productApi.getImages();
        setAvailableImages(images);
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      showError('Upload Failed', 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      
      // Filter out empty items before saving
      const cleanedFormData = {
        ...formData,
        benefits: formData.benefits.filter(b => b.trim() !== ''),
        applications: formData.applications.filter(a => a.trim() !== ''),
        technical: formData.technical.filter(t => t.property.trim() !== '' && t.value.trim() !== ''),
      };
      
      if (isNewProduct) {
        // Prepare product data for creation (backend expects 'name' field)
        const productData = {
          ...cleanedFormData,
          name: cleanedFormData.full_name || cleanedFormData.product_id, // Use full_name as name
          last_edited: user ? `${user.name} - ${new Date().toLocaleString()}` : undefined,
        };
        
        const result = await productApi.createProduct(productData);
        if (result.success && result.product_id) {
          showSuccess('Product Created', `"${formData.full_name}" has been created successfully!`);
          navigate(`/products/${result.product_id}`);
        } else {
          throw new Error(result.message || 'Product creation failed - no product_id returned');
        }
      } else {
        const productId = formData.product_id || id;
        if (!productId) {
          throw new Error('Product ID is required for updates');
        }
        await productApi.updateProduct(productId, cleanedFormData);
        showSuccess('Product Updated', `"${formData.full_name}" has been updated successfully!`);
        navigate(`/products/${productId}`);
      }
    } catch (error: any) {
      console.error('Failed to save product:', error);
      
      let errorMessage = 'Failed to save product. Please try again.';
      let errorTitle = 'Save Failed';
      
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.status === 400) {
        errorTitle = 'Validation Error';
        errorMessage = 'The product data is invalid. Please check all required fields.';
      } else if (error?.response?.status === 500) {
        errorTitle = 'Server Error';
        errorMessage = 'The server encountered an error. Please try again later.';
      }
      
      showError(errorTitle, errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !isNewProduct) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
          <span className="text-lg text-gray-600">Loading product...</span>
        </div>
      </div>
    );
  }

  if (error && !isNewProduct) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Product Not Found</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <Link to="/products">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Products
          </Button>
        </Link>
      </div>
    );
  }

  const imageUrl = getProductImageUrl({ image: formData.image }, apiBaseUrl);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to={isNewProduct ? "/products" : `/products/${id}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {isNewProduct ? 'Back to Products' : 'Back to Product'}
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {isNewProduct ? 'Create New Product' : `Edit ${product?.full_name || product?.name}`}
            </h1>
            <p className="text-gray-600 mt-1">
              {isNewProduct ? 'Add a new product to the catalog' : 'Update product information'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(isNewProduct ? "/products" : `/products/${id}`)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Saving...' : 'Save Product'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product ID *
                  </label>
                  <Input
                    value={formData.product_id}
                    onChange={(e) => handleInputChange('product_id', e.target.value)}
                    placeholder="Enter product ID"
                    error={validationErrors.product_id}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <div className="flex items-center gap-4 pt-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={!formData.published}
                        onChange={() => handleInputChange('published', false)}
                        className="text-primary-600"
                      />
                      <span className="text-sm">Draft</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={formData.published}
                        onChange={() => handleInputChange('published', true)}
                        className="text-primary-600"
                      />
                      <span className="text-sm">Published</span>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  placeholder="Enter full product name"
                  error={validationErrors.full_name}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter product description"
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand *
                  </label>
                  <select
                    value={formData.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    {brands.map((brand) => (
                      <option key={brand.value} value={brand.value}>
                        {brand.label}
                      </option>
                    ))}
                  </select>
                  {validationErrors.brand && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.brand}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry *
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    {industries.map((industry) => (
                      <option key={industry.value} value={industry.value}>
                        {industry.label}
                      </option>
                    ))}
                  </select>
                  {validationErrors.industry && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.industry}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chemistry
                  </label>
                  <select
                    value={formData.chemistry}
                    onChange={(e) => handleInputChange('chemistry', e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product URL
                </label>
                <Input
                  value={formData.url}
                  onChange={(e) => handleInputChange('url', e.target.value)}
                  placeholder="https://forzabuilt.com/product/..."
                  type="url"
                />
              </div>
            </CardContent>
          </Card>

          {/* Benefits */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Benefits ({formData.benefits.length})</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleArrayAdd('benefits')}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Benefit
              </Button>
            </CardHeader>
            <CardContent>
              {formData.benefits.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No benefits added yet. Click "Add Benefit" to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {formData.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={benefit}
                        onChange={(e) => handleArrayUpdate('benefits', index, e.target.value)}
                        placeholder="Enter benefit description"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleArrayRemove('benefits', index)}
                        className="p-2 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Applications */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Applications ({formData.applications.length})</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleArrayAdd('applications')}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Application
              </Button>
            </CardHeader>
            <CardContent>
              {formData.applications.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No applications added yet. Click "Add Application" to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {formData.applications.map((application, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <textarea
                        value={application}
                        onChange={(e) => handleArrayUpdate('applications', index, e.target.value)}
                        placeholder="Enter application description"
                        className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        rows={2}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleArrayRemove('applications', index)}
                        className="p-2 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Technical Properties */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Technical Properties ({formData.technical.length})</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTechnicalAdd}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Property
              </Button>
            </CardHeader>
            <CardContent>
              {formData.technical.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No technical properties added yet. Click "Add Property" to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {formData.technical.map((tech, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={tech.property}
                        onChange={(e) => handleTechnicalUpdate(index, 'property', e.target.value)}
                        placeholder="Property name"
                        className="flex-1"
                      />
                      <Input
                        value={tech.value}
                        onChange={(e) => handleTechnicalUpdate(index, 'value', e.target.value)}
                        placeholder="Property value"
                        className="flex-1"
                      />
                      <Input
                        value={tech.unit || ''}
                        onChange={(e) => handleTechnicalUpdate(index, 'unit', e.target.value)}
                        placeholder="Unit (optional)"
                        className="w-24"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTechnicalRemove(index)}
                        className="p-2 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sizing Information */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sizing Information ({Object.keys(formData.sizing || {}).length})</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSizingAdd}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Dimension
              </Button>
            </CardHeader>
            <CardContent>
              {Object.keys(formData.sizing || {}).length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No sizing information added yet. Click "Add Dimension" to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(formData.sizing || {}).map(([key, value], index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={key}
                        onChange={(e) => {
                          const newKey = e.target.value;
                          const newSizing = { ...formData.sizing };
                          delete newSizing[key];
                          newSizing[newKey] = value;
                          setFormData(prev => ({ ...prev, sizing: newSizing }));
                        }}
                        placeholder="Dimension name (e.g., length, width, height)"
                        className="flex-1"
                      />
                      <Input
                        value={String(value)}
                        onChange={(e) => handleSizingUpdate(key, e.target.value)}
                        placeholder="Value"
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSizingRemove(key)}
                        className="p-2 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Packaging Information */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Packaging Information ({formData.packaging.length})</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePackagingAdd}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Packaging
              </Button>
            </CardHeader>
            <CardContent>
              {formData.packaging.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No packaging information added yet. Click "Add Packaging" to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {formData.packaging.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={item}
                        onChange={(e) => handlePackagingUpdate(index, e.target.value)}
                        placeholder="Packaging description"
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePackagingRemove(index)}
                        className="p-2 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Product Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Technical Data Sheet (TDS) URL
                </label>
                <Input
                  value={formData.tds_pdf || ''}
                  onChange={(e) => handleInputChange('tds_pdf', e.target.value)}
                  placeholder="https://example.com/documents/product-tds.pdf"
                  type="url"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the URL to the Technical Data Sheet PDF
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Safety Data Sheet (SDS) URL
                </label>
                <Input
                  value={formData.sds_pdf || ''}
                  onChange={(e) => handleInputChange('sds_pdf', e.target.value)}
                  placeholder="https://example.com/documents/product-sds.pdf"
                  type="url"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the URL to the Safety Data Sheet PDF
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Product Image */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Image
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImageUpload
                onImageUpload={(url) => handleInputChange('image', url)}
                currentImage={formData.image ? imageUrl : undefined}
              />

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowImagePicker(true)}
              >
                Choose Existing Image
              </Button>

              {formData.image && (
                <div className="text-xs text-gray-500">
                  Current: {formData.image}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Form Status */}
          <Card>
            <CardHeader>
              <CardTitle>Form Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Required fields</span>
                  <div className="flex items-center gap-1">
                    {Object.keys(validationErrors).length === 0 ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-sm ${Object.keys(validationErrors).length === 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {Object.keys(validationErrors).length === 0 ? 'Complete' : 'Missing'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Benefits</span>
                  <Badge variant="secondary">
                    {formData.benefits.length}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Applications</span>
                  <Badge variant="secondary">
                    {formData.applications.length}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Technical Properties</span>
                  <Badge variant="secondary">
                    {formData.technical.length}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Picker Modal */}
      {showImagePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl mx-4 max-h-[80vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Choose Image</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImagePicker(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="overflow-y-auto">
              {availableImages.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No images available. Upload an image first.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {availableImages.map((image) => (
                    <button
                      key={image.filename}
                      onClick={() => {
                        handleInputChange('image', image.filename);
                        setShowImagePicker(false);
                      }}
                      className="group relative rounded-lg overflow-hidden hover:ring-2 hover:ring-primary-500"
                    >
                      <ImageSkeleton
                        src={getProductImageUrl({ image: image.filename }, apiBaseUrl)}
                        alt={image.filename}
                        className="w-full h-full"
                        aspectRatio="square"
                        objectFit="cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-2 truncate">
                        {image.filename}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProductEditPage;
