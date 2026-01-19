import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  RefreshCw, 
  Download, 
  Trash2, 
  Upload, 
  Clock, 
  User, 
  Package,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Plus,
  Eye,
  RotateCcw
} from 'lucide-react';
import { useApi } from '../contexts/ApiContext';
import { useToast } from '../contexts/ToastContext';

interface Backup {
  id: number;
  backup_name: string;
  description?: string;
  created_by: string;
  product_count: number;
  file_path?: string;
  status: 'active' | 'promoted' | 'archived';
  promoted_at?: string;
  promoted_by?: string;
  created_at: string;
}

interface BackupPreview {
  products: { product_id: string; name: string; brand: string; industry: string }[];
  total: number;
}

interface BackupManagerProps {
  userName: string;
  onBackupPromoted?: () => void;
}

const BackupManager: React.FC<BackupManagerProps> = ({ userName, onBackupPromoted }) => {
  const { apiBaseUrl } = useApi();
  const { showSuccess, showError, showInfo } = useToast();
  
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [promoting, setPromoting] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBackupName, setNewBackupName] = useState('');
  const [newBackupDescription, setNewBackupDescription] = useState('');
  const [previewBackup, setPreviewBackup] = useState<{ backup: Backup; preview: BackupPreview } | null>(null);
  const [confirmPromote, setConfirmPromote] = useState<Backup | null>(null);

  useEffect(() => {
    fetchBackups();
  }, [apiBaseUrl]);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/api/backups`);
      const data = await response.json();
      if (data.success) {
        setBackups(data.backups);
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
      showError('Error', 'Failed to fetch backups');
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    if (!newBackupName.trim()) {
      showError('Error', 'Please enter a backup name');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch(`${apiBaseUrl}/api/backups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBackupName,
          description: newBackupDescription,
          created_by: userName
        })
      });

      const data = await response.json();
      if (data.success) {
        showSuccess('Backup Created', `"${newBackupName}" backup created with ${data.backup.product_count} products`);
        setNewBackupName('');
        setNewBackupDescription('');
        setShowCreateForm(false);
        fetchBackups();
      } else {
        showError('Error', data.error || 'Failed to create backup');
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      showError('Error', 'Failed to create backup');
    } finally {
      setCreating(false);
    }
  };

  const promoteBackup = async (backup: Backup) => {
    try {
      setPromoting(backup.id);
      const response = await fetch(`${apiBaseUrl}/api/backups/${backup.id}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoted_by: userName })
      });

      const data = await response.json();
      if (data.success) {
        showSuccess('Backup Promoted', `Restored ${data.productsRestored} products from "${backup.backup_name}"`);
        setConfirmPromote(null);
        fetchBackups();
        if (onBackupPromoted) {
          onBackupPromoted();
        }
      } else {
        showError('Error', data.message || 'Failed to promote backup');
      }
    } catch (error) {
      console.error('Error promoting backup:', error);
      showError('Error', 'Failed to promote backup');
    } finally {
      setPromoting(null);
    }
  };

  const deleteBackup = async (backup: Backup) => {
    try {
      setDeleting(backup.id);
      const response = await fetch(`${apiBaseUrl}/api/backups/${backup.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleted_by: userName })
      });

      const data = await response.json();
      if (data.success) {
        showSuccess('Backup Deleted', `"${backup.backup_name}" has been deleted`);
        fetchBackups();
      } else {
        showError('Error', data.error || 'Failed to delete backup');
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      showError('Error', 'Failed to delete backup');
    } finally {
      setDeleting(null);
    }
  };

  const fetchPreview = async (backup: Backup) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/backups/${backup.id}/preview`);
      const data = await response.json();
      if (data.success) {
        setPreviewBackup({ backup, preview: data });
      }
    } catch (error) {
      console.error('Error fetching preview:', error);
      showError('Error', 'Failed to load backup preview');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'promoted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle2 className="h-3 w-3" />
            Promoted
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            <Archive className="h-3 w-3" />
            Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="h-3 w-3" />
            Active
          </span>
        );
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Archive className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Backup Manager</h2>
            <p className="text-sm text-gray-500">Create and restore product data snapshots</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchBackups}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            <Plus className="h-4 w-4" />
            Create Backup
          </button>
        </div>
      </div>

      {/* Create Backup Form */}
      {showCreateForm && (
        <div className="mb-6 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Backup</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Backup Name *
              </label>
              <input
                type="text"
                value={newBackupName}
                onChange={(e) => setNewBackupName(e.target.value)}
                placeholder="e.g., Pre-launch backup, January 2026 snapshot"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={newBackupDescription}
                onChange={(e) => setNewBackupDescription(e.target.value)}
                placeholder="Add notes about this backup..."
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={createBackup}
                disabled={creating || !newBackupName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Create Backup
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setNewBackupName('');
                  setNewBackupDescription('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backups List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
        </div>
      ) : backups.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Backups Yet</h3>
          <p className="text-gray-500 mb-4">Create your first backup to protect your product data</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Backup
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {backups.map((backup) => (
            <div
              key={backup.id}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{backup.backup_name}</h3>
                    {getStatusBadge(backup.status)}
                  </div>
                  {backup.description && (
                    <p className="text-gray-600 text-sm mb-3">{backup.description}</p>
                  )}
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      {backup.product_count} products
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {backup.created_by}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDate(backup.created_at)}
                    </span>
                  </div>
                  {backup.promoted_at && (
                    <div className="mt-2 text-sm text-green-600">
                      Promoted by {backup.promoted_by} on {formatDate(backup.promoted_at)}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => fetchPreview(backup)}
                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Preview backup contents"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setConfirmPromote(backup)}
                    disabled={promoting === backup.id}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium"
                    title="Promote this backup to production"
                  >
                    {promoting === backup.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="h-4 w-4" />
                    )}
                    Promote
                  </button>
                  <button
                    onClick={() => deleteBackup(backup)}
                    disabled={deleting === backup.id}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete backup"
                  >
                    {deleting === backup.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Trash2 className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {previewBackup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                Backup Preview: {previewBackup.backup.backup_name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {previewBackup.preview.total} products in this backup
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-2">
                {previewBackup.preview.products.map((product) => (
                  <div key={product.product_id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <span className="font-mono text-sm text-indigo-600 font-medium">{product.product_id}</span>
                    <span className="text-gray-900 flex-1">{product.name}</span>
                    <span className="text-sm text-gray-500">{product.brand} / {product.industry}</span>
                  </div>
                ))}
                {previewBackup.preview.total > 20 && (
                  <div className="text-center text-gray-500 py-4">
                    ... and {previewBackup.preview.total - 20} more products
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setPreviewBackup(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promote Confirmation Modal */}
      {confirmPromote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Confirm Promotion</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Are you sure you want to promote <strong>"{confirmPromote.backup_name}"</strong>?
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-amber-800 text-sm">
                <strong>Warning:</strong> This will replace ALL current production data with {confirmPromote.product_count} products from this backup. This action cannot be undone (but you can create a backup first).
              </p>
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setConfirmPromote(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => promoteBackup(confirmPromote)}
                disabled={promoting === confirmPromote.id}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
              >
                {promoting === confirmPromote.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Promoting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    Yes, Promote Backup
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupManager;

