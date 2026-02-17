import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { blogsApi, type BlogPost } from '@/services/api';

const BlogsView: React.FC = () => {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBlogs = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await blogsApi.getBlogs();
        setBlogs(data);
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setError('Blogs endpoint not found on API yet. Add /api/blogs to enable this section.');
        } else if (axios.isAxiosError(err)) {
          setError(err.response?.data?.error || err.message || 'Failed to load blogs');
        } else {
          setError('Failed to load blogs');
        }
      } finally {
        setIsLoading(false);
      }
    };

    void fetchBlogs();
  }, []);

  if (isLoading) {
    return <div className="p-6 text-sm text-gray-600">Loading blogs...</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900">Blogs</h2>
      <p className="mt-1 text-sm text-gray-600">Team visibility into blog content coming from the API.</p>

      {error ? (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">{error}</div>
      ) : blogs.length === 0 ? (
        <div className="mt-4 rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-600">No blog posts found.</div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Author</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Published</th>
              </tr>
            </thead>
            <tbody>
              {blogs.map((blog) => (
                <tr key={String(blog.id)} className="border-t border-gray-100">
                  <td className="px-4 py-3">{blog.title || '(untitled)'}</td>
                  <td className="px-4 py-3">{blog.author || '-'}</td>
                  <td className="px-4 py-3">{blog.status || '-'}</td>
                  <td className="px-4 py-3">{blog.published_at ? new Date(blog.published_at).toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BlogsView;

