import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AdminTokenBar from '@/components/team/AdminTokenBar';
import { adminApi, type NewsletterSubscriber } from '@/services/api';

const NewsletterSignupsView: React.FC = () => {
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('admin-token') || '');
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('admin-token', adminToken);
  }, [adminToken]);

  const loadSubscribers = async () => {
    if (!adminToken.trim()) {
      setError('Enter admin token to load newsletter signups.');
      setSubscribers([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await adminApi.getNewsletterSubscribers(adminToken, { limit: 100 });
      setSubscribers(response.items);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || err.message || 'Failed to load newsletter signups');
      } else {
        setError('Failed to load newsletter signups');
      }
      setSubscribers([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Newsletter Signups</h2>
          <p className="mt-1 text-sm text-gray-600">Latest email subscriptions and their current opt-in status.</p>
        </div>
        <button
          onClick={() => void loadSubscribers()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      <div className="mt-4">
        <AdminTokenBar adminToken={adminToken} onChange={setAdminToken} />
      </div>

      {isLoading && <div className="mt-4 text-sm text-gray-600">Loading newsletter signups...</div>}

      {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {!isLoading && !error && subscribers.length === 0 ? (
        <div className="mt-4 rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-600">No signups found.</div>
      ) : null}

      {subscribers.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Confirmed</th>
                <th className="px-4 py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">{item.email}</td>
                  <td className="px-4 py-3">{item.status}</td>
                  <td className="px-4 py-3">{item.source || '-'}</td>
                  <td className="px-4 py-3">{item.confirmed_at ? new Date(item.confirmed_at).toLocaleString() : '-'}</td>
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

export default NewsletterSignupsView;

