import React, { createContext, useContext, useState, useEffect } from 'react';
import { setApiBaseUrl, setAdminBaseUrl } from '@/services/api';

export type ApiEnvironment = 'local' | 'heroku';

interface ApiContextType {
  environment: ApiEnvironment;
  setEnvironment: (env: ApiEnvironment) => void;
  apiBaseUrl: string;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

const API_URLS = {
  local: 'http://localhost:5000',
  heroku: 'https://forza-product-managementsystem-b7c3ff8d3d2d.herokuapp.com', // Working Heroku URL
};

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [environment, setEnvironment] = useState<ApiEnvironment>(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('api-environment');
    if (saved) {
      return saved as ApiEnvironment;
    }
    // Default to 'heroku' (production) - always use production database
    return 'heroku';
  });

  const apiBaseUrl = API_URLS[environment];

  // Update API base URL immediately when component mounts and when environment changes
  useEffect(() => {
    setApiBaseUrl(apiBaseUrl);
    setAdminBaseUrl(apiBaseUrl);
  }, [apiBaseUrl, environment]);

  // Save to localStorage when environment changes
  useEffect(() => {
    localStorage.setItem('api-environment', environment);
  }, [environment]);

  return (
    <ApiContext.Provider value={{ environment, setEnvironment, apiBaseUrl }}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = () => {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};
