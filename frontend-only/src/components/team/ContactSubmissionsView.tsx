import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AdminTokenBar from '@/components/team/AdminTokenBar';
import { adminApi, type ContactSubmission } from '@/services/api';

const ContactSubmissionsView: React.FC = () => {
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('admin-token') || '');
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('admin-token', adminToken);
  }, [adminToken]);

  const loadSubmissions = async () => {
    if (!adminToken.trim()) {
      setError('Enter admin token to load submissions.');
      setSubmissions([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await adminApi.getContactSubmissions(adminToken, { limit: 100 });
      setSubmissions(response.items);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || err.message || 'Failed to load submissions');
      } else {
        setError('Failed to load submissions');
      }
      setSubmissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Contact Form Submissions</h2>
          <p className="mt-1 text-sm text-gray-600">Latest inbound messages submitted from the website.</p>
        </div>
        <button
          onClick={() => void loadSubmissions()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      <div className="mt-4">
        <AdminTokenBar adminToken={adminToken} onChange={setAdminToken} />
      </div>

      {isLoading && <div className="mt-4 text-sm text-gray-600">Loading submissions...</div>}

      {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {!isLoading && !error && submissions.length === 0 ? (
        <div className="mt-4 rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-600">No submissions found.</div>
      ) : null}

      {submissions.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Message</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((item) => (
                <tr key={item.id} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-3">{item.first_name} {item.last_name}</td>
                  <td className="px-4 py-3">{item.email}</td>
                  <td className="max-w-md px-4 py-3 text-gray-700">{item.message}</td>
                  <td className="px-4 py-3">{item.status}</td>
                  <td className="px-4 py-3">{new Date(item.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ContactSubmissionsView;

