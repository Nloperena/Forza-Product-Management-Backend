import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Heart } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Branding */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Forza Products</h3>
                <p className="text-xs text-gray-500">Management System</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Comprehensive product management and catalog system for our team of racing excellence.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Quick Links</h4>
            <nav className="space-y-2">
              <Link 
                to="/" 
                className="block text-sm text-gray-600 hover:text-primary-600 transition-colors"
              >
                Dashboard
              </Link>
              <Link 
                to="/products" 
                className="block text-sm text-gray-600 hover:text-primary-600 transition-colors"
              >
                Products
              </Link>
              <Link 
                to="/products/new" 
                className="block text-sm text-gray-600 hover:text-primary-600 transition-colors"
              >
                Add Product
              </Link>
            </nav>
          </div>

          {/* System Info */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">System Information</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <p className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Version: Alpha 1.0.0
              </p>
              <p>Environment: Preview</p>
              <p className="text-xs text-gray-500 mt-4">
                This is an alpha preview version. Features and data may change.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-600">
            <p>
              © {currentYear} Forza Products. All rights reserved.
            </p>
            <div className="flex flex-col items-center sm:items-end gap-1">
              <p className="flex items-center gap-1">
                Made with <Heart className="h-4 w-4 text-red-500 fill-current" /> from the marketing team
              </p>
              <p className="text-xs text-gray-500 text-center sm:text-right">
                Questions or feedback? Contact Nico Loperena on Microsoft Teams
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

