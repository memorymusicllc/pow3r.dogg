import { useState, useEffect } from 'react';
import { fileTrackerApi, type HoneypotDocument, type FileAnalytics } from '../api/fileTracker';
import { emitComponentEvent } from '../utils/observability';
import { DocumentIcon, ChartBarIcon, TrashIcon, PlusIcon, MagnifyingGlassIcon, ArrowDownTrayIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import * as Dialog from '@radix-ui/react-dialog';

const COMPONENT_ID = 'file-tracker';

export default function FileTracker() {
  const [files, setFiles] = useState<HoneypotDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [analytics, setAnalytics] = useState<FileAnalytics | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [formatFilter, setFormatFilter] = useState<'all' | 'pdf' | 'docx' | 'xlsx'>('all');
  const limit = 20;

  const [newFile, setNewFile] = useState({
    format: 'pdf' as 'pdf' | 'docx' | 'xlsx',
    content: '',
    contentDescription: '',
    expiresIn: '',
  });

  useEffect(() => {
    loadFiles();
    const interval = setInterval(loadFiles, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [page, searchQuery, formatFilter]);

  const loadFiles = async () => {
    const startTime = Date.now();
    setLoading(true);
    setError(null);

    try {
      emitComponentEvent(COMPONENT_ID, 'data_load_start', {});
      const result = await fileTrackerApi.listFiles({
        limit,
        offset: page * limit,
        search: searchQuery || undefined,
        format: formatFilter !== 'all' ? formatFilter : undefined,
      });
      setFiles(result.files);
      setTotal(result.total);
      emitComponentEvent(COMPONENT_ID, 'data_load_complete', {
        duration: Date.now() - startTime,
        count: result.files.length,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load files';
      setError(errorMessage);
      setFiles([]);
      emitComponentEvent(COMPONENT_ID, 'data_load_error', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFile = async () => {
    if (!newFile.content) {
      setError('Content is required');
      return;
    }

    try {
      setLoading(true);
      const file = await fileTrackerApi.createFile({
        format: newFile.format,
        content: newFile.content,
        contentDescription: newFile.contentDescription || undefined,
        expiresIn: newFile.expiresIn ? parseInt(newFile.expiresIn) : undefined,
      });
      setFiles([file, ...files]);
      setShowCreateDialog(false);
      setNewFile({
        format: 'pdf',
        content: '',
        contentDescription: '',
        expiresIn: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create file');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await fileTrackerApi.deleteFile(documentId);
      setFiles(files.filter(f => f.documentId !== documentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  const handleViewAnalytics = async (file: HoneypotDocument) => {
    try {
      setLoading(true);
      const analyticsData = await fileTrackerApi.getAnalytics(file.documentId);
      setAnalytics(analyticsData);
      setShowAnalyticsDialog(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (file: HoneypotDocument) => {
    window.open(file.downloadUrl, '_blank');
  };

  const handleExport = async () => {
    try {
      const blob = await fileTrackerApi.exportFiles({ format: 'csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `files-export-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export');
    }
  };

  const formatDate = (timestamp?: number) => {
    return timestamp ? new Date(timestamp).toLocaleString() : 'N/A';
  };

  const isExpired = (file: HoneypotDocument) => {
    return file.expiresAt ? Date.now() > file.expiresAt : false;
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-true-black-text theme-light:text-light-text theme-glass:text-glass-text">
            File Tracker
          </h2>
          <p className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted mt-1">
            Manage and track honeypot documents
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg text-true-black-text theme-light:text-light-text theme-glass:text-glass-text hover:bg-true-black-bg-hover theme-light:hover:bg-light-bg-hover theme-glass:hover:bg-glass-bg-hover flex items-center gap-2"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Create File
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg text-true-black-text theme-light:text-light-text theme-glass:text-glass-text"
          />
        </div>
        <select
          value={formatFilter}
          onChange={(e) => setFormatFilter(e.target.value as typeof formatFilter)}
          className="px-4 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg text-true-black-text theme-light:text-light-text theme-glass:text-glass-text"
        >
          <option value="all">All Formats</option>
          <option value="pdf">PDF</option>
          <option value="docx">DOCX</option>
          <option value="xlsx">XLSX</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Files List */}
      {loading && files.length === 0 ? (
        <div className="text-center py-12 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
          Loading files...
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-12 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
          No files found. Create your first tracking file!
        </div>
      ) : (
        <div className="space-y-3">
          {files.map((file) => (
            <div
              key={file.documentId}
              className="p-4 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <DocumentIcon className="w-5 h-5 text-blue-500" />
                    <span className="font-semibold text-true-black-text theme-light:text-light-text theme-glass:text-glass-text">
                      {file.contentDescription || `honeypot.${file.format}`}
                    </span>
                    <span className="px-2 py-1 bg-blue-900/20 text-blue-400 text-xs rounded uppercase">
                      {file.format}
                    </span>
                    {isExpired(file) && (
                      <span className="px-2 py-1 bg-red-900/20 text-red-400 text-xs rounded">
                        Expired
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
                    <span>Created: {formatDate(file.createdAt)}</span>
                    {file.expiresAt && (
                      <span>Expires: {formatDate(file.expiresAt)}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(file)}
                    className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1 text-sm"
                  >
                    <ArrowDownIcon className="w-4 h-4" />
                    Download
                  </button>
                  <button
                    onClick={() => handleViewAnalytics(file)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-sm"
                  >
                    <ChartBarIcon className="w-4 h-4" />
                    Analytics
                  </button>
                  <button
                    onClick={() => handleDeleteFile(file.documentId)}
                    className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1 text-sm"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-true-black-text theme-light:text-light-text theme-glass:text-glass-text">
            Page {page + 1} of {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={(page + 1) * limit >= total}
            className="px-4 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Create File Dialog */}
      <Dialog.Root open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg p-6 w-full max-w-md z-50">
            <Dialog.Title className="text-xl font-bold mb-4">Create Tracking File</Dialog.Title>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Format *</label>
                <select
                  value={newFile.format}
                  onChange={(e) => setNewFile({ ...newFile, format: e.target.value as typeof newFile.format })}
                  className="w-full px-3 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                >
                  <option value="pdf">PDF</option>
                  <option value="docx">DOCX</option>
                  <option value="xlsx">XLSX</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Content Description</label>
                <input
                  type="text"
                  value={newFile.contentDescription}
                  onChange={(e) => setNewFile({ ...newFile, contentDescription: e.target.value })}
                  className="w-full px-3 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                  placeholder="Document description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Content *</label>
                <textarea
                  value={newFile.content}
                  onChange={(e) => setNewFile({ ...newFile, content: e.target.value })}
                  className="w-full px-3 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                  rows={4}
                  placeholder="Document content..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Expires In (seconds)</label>
                <input
                  type="number"
                  value={newFile.expiresIn}
                  onChange={(e) => setNewFile({ ...newFile, expiresIn: e.target.value })}
                  className="w-full px-3 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowCreateDialog(false)}
                  className="px-4 py-2 border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFile}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Analytics Dialog */}
      <Dialog.Root open={showAnalyticsDialog} onOpenChange={setShowAnalyticsDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto z-50">
            <Dialog.Title className="text-xl font-bold mb-4">File Analytics</Dialog.Title>
            {analytics && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary rounded">
                    <div className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">Downloads</div>
                    <div className="text-2xl font-bold">{analytics.downloadCount}</div>
                  </div>
                  <div className="p-4 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary rounded">
                    <div className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">Views</div>
                    <div className="text-2xl font-bold">{analytics.viewCount}</div>
                  </div>
                  <div className="p-4 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary rounded">
                    <div className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">Opens</div>
                    <div className="text-2xl font-bold">{analytics.openCount}</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Event History</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {analytics.events.length === 0 ? (
                      <p className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">No events yet</p>
                    ) : (
                      analytics.events.map((event) => (
                        <div
                          key={event.id}
                          className="p-3 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary rounded text-sm"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-blue-900/20 text-blue-400 rounded text-xs uppercase">
                                  {event.eventType}
                                </span>
                                <span className="font-mono text-xs">{event.ipAddress || 'Unknown IP'}</span>
                              </div>
                              <div className="text-xs text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted mt-1">
                                {event.country && event.city ? `${event.city}, ${event.country}` : event.country || 'Unknown location'}
                              </div>
                              {event.userAgent && (
                                <div className="text-xs text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted truncate max-w-md mt-1">
                                  {event.userAgent}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
                              {formatDate(event.timestamp)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowAnalyticsDialog(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

