import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Package, Plus, BarChart3, Settings } from 'lucide-react';

const Header: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
                <Package className="h-5 w-5" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900">Forza Products</h1>
                <p className="text-xs text-gray-500">Management System</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link to="/">
              <Button
                variant={isActive('/') ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link to="/products">
              <Button
                variant={isActive('/products') ? 'secondary' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <Package className="h-4 w-4" />
                Products
              </Button>
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-blue-600 border-blue-200">
              Read-Only
            </Badge>
            <Button variant="ghost" size="sm" className="p-2">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <nav className="flex">
          <Link to="/" className="flex-1">
            <Button
              variant={isActive('/') ? 'secondary' : 'ghost'}
              className="w-full justify-center gap-2 rounded-none py-3"
            >
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link to="/products" className="flex-1">
            <Button
              variant={isActive('/products') ? 'secondary' : 'ghost'}
              className="w-full justify-center gap-2 rounded-none py-3"
            >
              <Package className="h-4 w-4" />
              Products
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
