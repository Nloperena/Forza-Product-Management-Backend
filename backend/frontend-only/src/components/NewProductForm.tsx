import React, { useState } from 'react';
import { productApi } from '@/services/api';
import { useToast } from '@/components/ui/ToastContainer';
import { useUser } from '@/contexts/UserContext';
import { Plus, Save, X, Trash2, Loader2 } from 'lucide-react';
import type { Product, ProductFormData, TechnicalProperty } from '@/types/product';

interface NewProductFormProps {
  onProductCreated: (product: Product) => void;
  onCancel: () => void;
}

const NewProductForm: React.FC<NewProductFormProps> = ({ onProductCreated, onCancel }) => {
  const { showSuccess, showError } = useToast();
  const { user } = useUser();
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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

      // Prepare product data for creation (backend expects 'name' field)
      const productData = {
        ...cleanedFormData,
        name: cleanedFormData.full_name || cleanedFormData.product_id, // Use full_name as name
        last_edited: user ? `${user.name} - ${new Date().toLocaleString()}` : undefined,
      };

      const result = await productApi.createProduct(productData);
      
      if (result.success && result.product_id) {
        showSuccess('Product Created', `"${formData.full_name}" has been created successfully!`);
        
        // Fetch the created product and pass it back
        const newProduct = await productApi.getProduct(result.product_id || formData.product_id);
        onProductCreated(newProduct);
      } else {
        throw new Error(result.message || 'Product creation failed - no product_id returned');
      }
    } catch (error: any) {
      console.error('Failed to create product:', error);
      
      let errorMessage = 'Failed to create product. Please try again.';
      let errorTitle = 'Create Failed';
      
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

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Product</h1>
            <p className="text-gray-600 mt-1">Fill in the details to create a new product</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </div>

        {/* Basic Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product ID *
              </label>
              <input
                type="text"
                value={formData.product_id}
                onChange={(e) => handleInputChange('product_id', e.target.value)}
                placeholder="Enter product ID (e.g., FRP)"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  validationErrors.product_id 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              {validationErrors.product_id && (
                <p className="text-sm text-red-600 mt-1">{validationErrors.product_id}</p>
              )}
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
                    className="text-blue-600"
                  />
                  <span className="text-sm">Draft</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={formData.published}
                    onChange={() => handleInputChange('published', true)}
                    className="text-blue-600"
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
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              placeholder="Enter full product name"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                validationErrors.full_name 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            {validationErrors.full_name && (
              <p className="text-sm text-red-600 mt-1">{validationErrors.full_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter product description"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand *
              </label>
              <select
                value={formData.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  validationErrors.brand 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              >
                {brands.map((brand) => (
                  <option key={brand.value} value={brand.value}>
                    {brand.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry *
              </label>
              <select
                value={formData.industry}
                onChange={(e) => handleInputChange('industry', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  validationErrors.industry 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              >
                {industries.map((industry) => (
                  <option key={industry.value} value={industry.value}>
                    {industry.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chemistry
              </label>
              <select
                value={formData.chemistry}
                onChange={(e) => handleInputChange('chemistry', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <input
              type="url"
              value={formData.url}
              onChange={(e) => handleInputChange('url', e.target.value)}
              placeholder="https://forzabuilt.com/product/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image URL
            </label>
            <input
              type="text"
              value={formData.image}
              onChange={(e) => handleInputChange('image', e.target.value)}
              placeholder="/product-images/product.png"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Benefits ({formData.benefits.length})</h2>
            <button
              onClick={() => handleArrayAdd('benefits')}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <Plus className="h-4 w-4" />
              Add Benefit
            </button>
          </div>
          <div className="space-y-2">
            {formData.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={benefit}
                  onChange={(e) => handleArrayUpdate('benefits', index, e.target.value)}
                  placeholder="Enter benefit description"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleArrayRemove('benefits', index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {formData.benefits.length === 0 && (
              <p className="text-gray-500 text-sm">No benefits added. Click "Add Benefit" to add one.</p>
            )}
          </div>
        </div>

        {/* Applications */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Applications ({formData.applications.length})</h2>
            <button
              onClick={() => handleArrayAdd('applications')}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <Plus className="h-4 w-4" />
              Add Application
            </button>
          </div>
          <div className="space-y-2">
            {formData.applications.map((application, index) => (
              <div key={index} className="flex items-center gap-2">
                <textarea
                  value={application}
                  onChange={(e) => handleArrayUpdate('applications', index, e.target.value)}
                  placeholder="Enter application description"
                  rows={2}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleArrayRemove('applications', index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {formData.applications.length === 0 && (
              <p className="text-gray-500 text-sm">No applications added. Click "Add Application" to add one.</p>
            )}
          </div>
        </div>

        {/* Technical Properties */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Technical Properties ({formData.technical.length})</h2>
            <button
              onClick={handleTechnicalAdd}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <Plus className="h-4 w-4" />
              Add Property
            </button>
          </div>
          <div className="space-y-2">
            {formData.technical.map((tech, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={tech.property}
                  onChange={(e) => handleTechnicalUpdate(index, 'property', e.target.value)}
                  placeholder="Property name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={tech.value}
                  onChange={(e) => handleTechnicalUpdate(index, 'value', e.target.value)}
                  placeholder="Value"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={tech.unit || ''}
                  onChange={(e) => handleTechnicalUpdate(index, 'unit', e.target.value)}
                  placeholder="Unit (optional)"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleTechnicalRemove(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {formData.technical.length === 0 && (
              <p className="text-gray-500 text-sm">No technical properties added. Click "Add Property" to add one.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewProductForm;


