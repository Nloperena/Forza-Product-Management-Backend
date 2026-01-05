import React from 'react';
import { useApi } from '@/contexts/ApiContext';
import { Server, Cloud } from 'lucide-react';

const ApiToggle: React.FC = () => {
  const { environment, setEnvironment } = useApi();

  const handleToggle = () => {
    setEnvironment(environment === 'local' ? 'heroku' : 'local');
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-600 hidden sm:inline">API:</span>
      <button
        onClick={handleToggle}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          ${environment === 'heroku' ? 'bg-primary-600' : 'bg-gray-200'}
        `}
        role="switch"
        aria-checked={environment === 'heroku'}
        aria-label={`Switch to ${environment === 'local' ? 'Heroku' : 'Local'} API`}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${environment === 'heroku' ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
      <div className="flex items-center space-x-1">
        <Server className={`h-4 w-4 ${environment === 'local' ? 'text-primary-600' : 'text-gray-400'}`} />
        <Cloud className={`h-4 w-4 ${environment === 'heroku' ? 'text-primary-600' : 'text-gray-400'}`} />
      </div>
      <span className="text-xs text-gray-500 hidden sm:inline">
        {environment === 'local' ? 'Local' : 'Heroku'}
      </span>
    </div>
  );
};

export default ApiToggle;






