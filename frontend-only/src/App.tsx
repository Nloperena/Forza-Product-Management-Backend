import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ToastProvider } from '@/components/ui/ToastContainer';
import { ApiProvider } from '@/contexts/ApiContext';
import { Button } from '@/components/ui/Button';
import Layout from '@/components/layout/Layout';
import Dashboard from '@/pages/Dashboard';
import ProductsPage from '@/pages/ProductsPage';
import ProductViewPage from '@/pages/ProductViewPage';
import ProductEditPage from '@/pages/ProductEditPage';
import { BarChart3 } from 'lucide-react';

const App: React.FC = () => {
  return (
    <ApiProvider>
      <ToastProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/products/new" element={<ProductEditPage />} />
              <Route path="/products/:id" element={<ProductViewPage />} />
              <Route path="/products/:id/edit" element={<ProductEditPage />} />
              <Route path="*" element={
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="text-center max-w-md">
                    <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-gray-100 rounded-full">
                      <span className="text-4xl">🔍</span>
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                    <h2 className="text-xl font-semibold text-gray-700 mb-3">Page Not Found</h2>
                    <p className="text-gray-600 mb-8">
                      The page you're looking for doesn't exist or has been moved.
                    </p>
                    <Link to="/">
                      <Button className="gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Back to Dashboard
                      </Button>
                    </Link>
                  </div>
                </div>
              } />
            </Routes>
          </Layout>
        </Router>
      </ToastProvider>
    </ApiProvider>
  );
};

export default App;
