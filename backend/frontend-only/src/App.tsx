import React, { useState, useEffect, useRef } from 'react';
import { ApiProvider, useApi } from '@/contexts/ApiContext';
import { UserProvider, useUser } from '@/contexts/UserContext';
import { ToastProvider } from '@/components/ui/ToastContainer';
import ProductList from '@/components/ProductList';
import ProductDetail from '@/components/ProductDetail';
import NewProductForm from '@/components/NewProductForm';
import BackupManager from '@/components/BackupManager';
import AuditLogViewer from '@/components/AuditLogViewer';
import Login from '@/components/Login';
import { CheckCircle, AlertCircle, LogOut, User, GripVertical, Package, Archive, History } from 'lucide-react';
import type { Product } from '@/types/product';

type AppView = 'products' | 'backups' | 'audit-log';

const ApiIndicator: React.FC = () => {
  const { environment, apiBaseUrl } = useApi();
  const isProduction = environment === 'heroku';
  
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100">
      {isProduction ? (
        <>
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-gray-700">Production (Heroku)</span>
        </>
      ) : (
        <>
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <span className="text-sm font-medium text-gray-700">Local</span>
        </>
      )}
    </div>
  );
};

const UserInfo: React.FC = () => {
  const { user, logout } = useUser();
  
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200">
        <User className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-blue-900">{user?.name}</span>
      </div>
      <button
        onClick={logout}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
        title="Logout"
      >
        <LogOut className="h-4 w-4" />
        <span>Logout</span>
      </button>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, user } = useUser();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentView, setCurrentView] = useState<AppView>('products');
  
  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved, 10) : 320; // Default 320px (w-80)
  });
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const MIN_WIDTH = 200;
  const MAX_WIDTH = 800;

  // Save sidebar width to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarWidth', sidebarWidth.toString());
  }, [sidebarWidth]);

  // Handle mouse drag for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleProductUpdated = (updatedProduct: Product) => {
    setSelectedProduct(updatedProduct);
    setIsCreatingNew(false);
    // Trigger refresh of product list
    setRefreshKey(prev => prev + 1);
  };

  const handleNewProduct = () => {
    setIsCreatingNew(true);
    setSelectedProduct(null);
  };

  const handleCancelCreate = () => {
    setIsCreatingNew(false);
    setSelectedProduct(null);
  };

  const handleProductCreated = (newProduct: Product) => {
    setSelectedProduct(newProduct);
    setIsCreatingNew(false);
    setRefreshKey(prev => prev + 1);
  };

  const handleProductDeleted = (productId: string) => {
    setSelectedProduct(null);
    setRefreshKey(prev => prev + 1);
  };

  if (!isAuthenticated) {
    return <Login />;
  }

  const handleBackupPromoted = () => {
    // Refresh product list after backup promotion
    setRefreshKey(prev => prev + 1);
    setSelectedProduct(null);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header with Navigation */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Forza Product Management</h1>
            <p className="text-sm text-gray-600 mt-1">Edit and manage products</p>
          </div>
          <div className="flex items-center gap-4">
            <ApiIndicator />
            <UserInfo />
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1">
          <button
            onClick={() => setCurrentView('products')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              currentView === 'products'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Package className="h-4 w-4" />
            Products
          </button>
          <button
            onClick={() => setCurrentView('backups')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              currentView === 'backups'
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Archive className="h-4 w-4" />
            Backups
          </button>
          <button
            onClick={() => setCurrentView('audit-log')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              currentView === 'audit-log'
                ? 'bg-amber-100 text-amber-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <History className="h-4 w-4" />
            Audit Log
          </button>
        </nav>
      </header>

      {/* Main Content */}
      {currentView === 'products' ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Product List */}
          <aside 
            ref={sidebarRef}
            className="bg-white border-r border-gray-200 flex flex-col relative"
            style={{ width: `${sidebarWidth}px`, minWidth: `${MIN_WIDTH}px`, maxWidth: `${MAX_WIDTH}px` }}
          >
            <ProductList 
              key={refreshKey}
              onSelectProduct={(product) => {
                setSelectedProduct(product);
                setIsCreatingNew(false);
              }}
              selectedProduct={selectedProduct}
              onNewProduct={handleNewProduct}
            />
            
            {/* Resize Handle */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizing(true);
              }}
              className={`
                absolute right-0 top-0 bottom-0 w-1 cursor-col-resize
                hover:bg-blue-500 transition-colors
                ${isResizing ? 'bg-blue-500' : 'bg-transparent'}
                group
              `}
              style={{ touchAction: 'none' }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-12 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-1 h-full bg-blue-500 rounded-full"></div>
              </div>
            </div>
          </aside>

          {/* Right Panel - Product Details */}
          <main className="flex-1 overflow-y-auto bg-white">
            {isCreatingNew ? (
              <NewProductForm
                onProductCreated={handleProductCreated}
                onCancel={handleCancelCreate}
              />
            ) : selectedProduct ? (
              <ProductDetail 
                product={selectedProduct} 
                onProductUpdated={handleProductUpdated}
                onProductDeleted={handleProductDeleted}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">📦</div>
                  <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                    Select a Product
                  </h2>
                  <p className="text-gray-500 text-lg">
                    Click on a product from the list to view and edit its details
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      ) : currentView === 'backups' ? (
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <BackupManager 
            userName={user?.name || 'Unknown'} 
            onBackupPromoted={handleBackupPromoted}
          />
        </main>
      ) : (
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <AuditLogViewer />
        </main>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <UserProvider>
      <ApiProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </ApiProvider>
    </UserProvider>
  );
};

export default App;