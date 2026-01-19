import React, { useState, useEffect } from 'react';
import { 
  History, 
  RefreshCw, 
  User, 
  Clock, 
  FileText,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Archive,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { useApi } from '@/contexts/ApiContext';

interface AuditLog {
  id: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'BACKUP';
  entity_type: 'product' | 'backup' | 'system';
  entity_id: string;
  user_name: string;
  user_email?: string;
  changes_summary: string;
  before_data?: string;
  after_data?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

interface AuditLogViewerProps {
  productId?: string; // If provided, filter to this product only
}

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ productId }) => {
  const { apiBaseUrl } = useApi();
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    action: '',
    entity_type: productId ? 'product' : '',
    user_name: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchLogs();
  }, [apiBaseUrl, filters, offset, productId]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.action) params.append('action', filters.action);
      if (filters.entity_type || productId) params.append('entity_type', productId ? 'product' : filters.entity_type);
      if (productId) params.append('entity_id', productId);
      if (filters.user_name) params.append('user_name', filters.user_name);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(`${apiBaseUrl}/api/audit-logs?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'UPDATE':
        return <Pencil className="h-4 w-4 text-blue-600" />;
      case 'DELETE':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case 'RESTORE':
        return <RotateCcw className="h-4 w-4 text-purple-600" />;
      case 'BACKUP':
        return <Archive className="h-4 w-4 text-indigo-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'RESTORE':
        return 'bg-purple-100 text-purple-800';
      case 'BACKUP':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const parseJsonSafe = (data: string | undefined) => {
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  };

  const renderDataDiff = (log: AuditLog) => {
    const before = parseJsonSafe(log.before_data);
    const after = parseJsonSafe(log.after_data);

    if (!before && !after) {
      return <p className="text-gray-500 italic">No detailed data available</p>;
    }

    return (
      <div className="grid grid-cols-2 gap-4">
        {before && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-red-400 rounded-full"></span>
              Before
            </h4>
            <pre className="text-xs bg-red-50 p-3 rounded-lg overflow-auto max-h-64 text-red-800">
              {JSON.stringify(before, null, 2)}
            </pre>
          </div>
        )}
        {after && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
              After
            </h4>
            <pre className="text-xs bg-green-50 p-3 rounded-lg overflow-auto max-h-64 text-green-800">
              {JSON.stringify(after, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={productId ? '' : 'p-6 max-w-6xl mx-auto'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <History className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {productId ? 'Change History' : 'Audit Log'}
            </h2>
            <p className="text-sm text-gray-500">
              {productId 
                ? 'Track all changes made to this product'
                : `${total} recorded actions`
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!productId && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                showFilters ? 'bg-amber-100 text-amber-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
          )}
          <button
            onClick={() => { setOffset(0); fetchLogs(); }}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && !productId && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                value={filters.action}
                onChange={(e) => { setFilters({ ...filters, action: e.target.value }); setOffset(0); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="RESTORE">Restore</option>
                <option value="BACKUP">Backup</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
              <select
                value={filters.entity_type}
                onChange={(e) => { setFilters({ ...filters, entity_type: e.target.value }); setOffset(0); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">All Types</option>
                <option value="product">Product</option>
                <option value="backup">Backup</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
              <input
                type="text"
                value={filters.user_name}
                onChange={(e) => { setFilters({ ...filters, user_name: e.target.value }); setOffset(0); }}
                placeholder="Search by user name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Logs List */}
      {loading && logs.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Yet</h3>
          <p className="text-gray-500">Changes to products will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-amber-300 transition-colors"
            >
              <button
                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${getActionColor(log.action).replace('text-', 'bg-').replace('-800', '-100')}`}>
                      {getActionIcon(log.action)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                        <span className="text-gray-500 text-sm">{log.entity_type}</span>
                        <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-mono">
                          {log.entity_id}
                        </code>
                      </div>
                      <p className="text-gray-900 font-medium">{log.changes_summary}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <User className="h-3 w-3" />
                        {log.user_name}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(log.created_at)}
                      </div>
                    </div>
                    {expandedLog === log.id ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </button>
              
              {expandedLog === log.id && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-500">Full Timestamp:</span>
                      <span className="ml-2 text-gray-900">{formatDate(log.created_at)}</span>
                    </div>
                    {log.ip_address && (
                      <div>
                        <span className="text-gray-500">IP Address:</span>
                        <span className="ml-2 text-gray-900 font-mono text-xs">{log.ip_address}</span>
                      </div>
                    )}
                    {log.user_email && (
                      <div>
                        <span className="text-gray-500">Email:</span>
                        <span className="ml-2 text-gray-900">{log.user_email}</span>
                      </div>
                    )}
                  </div>
                  {(log.before_data || log.after_data) && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Data Changes</h4>
                      {renderDataDiff(log)}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Showing {offset + 1} - {Math.min(offset + limit, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogViewer;

