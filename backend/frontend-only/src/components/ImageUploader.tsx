import React, { useState, useRef, useCallback } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Link as LinkIcon,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useApi } from '@/contexts/ApiContext';
import { useToast } from '@/components/ui/ToastContainer';

interface ImageUploaderProps {
  onImageUploaded?: (url: string) => void;
  productId?: string;
  currentImageUrl?: string;
  compact?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  onImageUploaded, 
  productId, 
  currentImageUrl,
  compact = false 
}) => {
  const { apiBaseUrl } = useApi();
  const { showSuccess, showError, showInfo } = useToast();
  
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [dragActive, setDragActive] = useState(false);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      showError('Invalid File Type', 'Please upload a JPEG, PNG, GIF, SVG, or WebP image.');
      return false;
    }

    if (file.size > maxSize) {
      showError('File Too Large', 'Image must be smaller than 10MB.');
      return false;
    }

    return true;
  };

  const uploadFile = async (file: File) => {
    if (!validateFile(file)) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);
      if (productId) {
        formData.append('product_id', productId);
      }

      // Try Vercel Blob first, fall back to local
      let response = await fetch(`${apiBaseUrl}/api/images/upload`, {
        method: 'POST',
        body: formData
      });

      let data = await response.json();

      // If Vercel Blob fails, try local upload
      if (!data.success && data.message?.includes('Vercel Blob not configured')) {
        showInfo('Using Local Storage', 'Vercel Blob not configured, uploading to local storage...');
        
        response = await fetch(`${apiBaseUrl}/api/images/upload-local`, {
          method: 'POST',
          body: formData
        });
        data = await response.json();
      }

      if (data.success) {
        setUploadedUrl(data.url);
        showSuccess('Image Uploaded', 'Your image has been uploaded successfully!');
        if (onImageUploaded) {
          onImageUploaded(data.url);
        }
      } else {
        showError('Upload Failed', data.message || 'Failed to upload image');
        setPreview(currentImageUrl || null);
      }
    } catch (error) {
      console.error('Upload error:', error);
      showError('Upload Error', 'An error occurred while uploading the image.');
      setPreview(currentImageUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      showError('No URL', 'Please enter an image URL.');
      return;
    }

    // Basic URL validation
    try {
      new URL(urlInput);
    } catch {
      showError('Invalid URL', 'Please enter a valid image URL.');
      return;
    }

    setPreview(urlInput);
    setUploadedUrl(urlInput);
    if (onImageUploaded) {
      onImageUploaded(urlInput);
    }
    showSuccess('URL Set', 'Image URL has been set successfully!');
  };

  const copyToClipboard = async () => {
    if (uploadedUrl) {
      await navigator.clipboard.writeText(uploadedUrl);
      showSuccess('Copied!', 'Image URL copied to clipboard.');
    }
  };

  const clearImage = () => {
    setPreview(null);
    setUploadedUrl(null);
    setUrlInput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/jpg,image/png,image/gif,image/svg+xml,image/webp"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Upload Image
          </button>
          {(preview || uploadedUrl) && (
            <div className="flex items-center gap-2">
              <img 
                src={preview || uploadedUrl || ''} 
                alt="Preview" 
                className="h-10 w-10 rounded object-cover border"
              />
              <button
                type="button"
                onClick={clearImage}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        {uploadedUrl && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="truncate max-w-xs">{uploadedUrl}</span>
            <button onClick={copyToClipboard} className="text-indigo-600 hover:text-indigo-800">
              <Copy className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            mode === 'upload' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <Upload className="h-4 w-4" />
          Upload File
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            mode === 'url' 
              ? 'bg-white text-indigo-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <LinkIcon className="h-4 w-4" />
          Paste URL
        </button>
      </div>

      {mode === 'upload' ? (
        /* Upload Zone */
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragActive 
              ? 'border-indigo-500 bg-indigo-50' 
              : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/jpg,image/png,image/gif,image/svg+xml,image/webp"
            className="hidden"
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
              <p className="text-gray-600">Uploading image...</p>
            </div>
          ) : preview ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="max-h-48 rounded-lg shadow-md"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {uploadedUrl && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Image uploaded successfully!</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 bg-indigo-100 rounded-full">
                <ImageIcon className="h-8 w-8 text-indigo-600" />
              </div>
              <div>
                <p className="text-gray-700 font-medium">
                  Drag and drop an image here, or{' '}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-indigo-600 hover:text-indigo-800 underline"
                  >
                    browse
                  </button>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Supports: JPEG, PNG, GIF, SVG, WebP (max 10MB)
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* URL Input */
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/image.png"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={handleUrlSubmit}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Set URL
            </button>
          </div>
          {preview && (
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <img 
                src={preview} 
                alt="Preview" 
                className="h-20 w-20 rounded-lg object-cover shadow"
              />
              <div className="flex-1">
                <p className="text-sm text-gray-600 truncate">{preview}</p>
                <div className="flex items-center gap-2 mt-2">
                  <a
                    href={preview}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open
                  </a>
                  <button
                    type="button"
                    onClick={clearImage}
                    className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Uploaded URL Display */}
      {uploadedUrl && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          <span className="text-sm text-green-800 truncate flex-1">{uploadedUrl}</span>
          <button
            type="button"
            onClick={copyToClipboard}
            className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-100 rounded transition-colors"
            title="Copy URL"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;

