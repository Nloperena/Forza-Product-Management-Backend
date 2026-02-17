import React from 'react';

interface AdminTokenBarProps {
  adminToken: string;
  onChange: (value: string) => void;
}

const AdminTokenBar: React.FC<AdminTokenBarProps> = ({ adminToken, onChange }) => {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="admin-token" className="text-sm font-medium text-gray-700">
        Admin Token
      </label>
      <input
        id="admin-token"
        type="password"
        value={adminToken}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Enter X-Admin-Token"
        className="w-80 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
      />
    </div>
  );
};

export default AdminTokenBar;

