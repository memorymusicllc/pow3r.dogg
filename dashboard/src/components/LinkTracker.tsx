import { useState, useEffect } from 'react';
import { linkTrackerApi, type ShortenedURL, type LinkAnalytics } from '../api/linkTracker';
import { emitComponentEvent } from '../utils/observability';
import { LinkIcon, ChartBarIcon, TrashIcon, PlusIcon, MagnifyingGlassIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import * as Dialog from '@radix-ui/react-dialog';

const COMPONENT_ID = 'link-tracker';

export default function LinkTracker() {
  const [links, setLinks] = useState<ShortenedURL[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [analytics, setAnalytics] = useState<LinkAnalytics | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [newLink, setNewLink] = useState({
    url: '',
    customCode: '',
    expiresIn: '',
    clickLimit: '',
    generateQR: false,
    tags: '',
  });

  useEffect(() => {
    loadLinks();
    const interval = setInterval(loadLinks, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [page, searchQuery]);

  const loadLinks = async () => {
    const startTime = Date.now();
    setLoading(true);
    setError(null);

    try {
      emitComponentEvent(COMPONENT_ID, 'data_load_start', {});
      const result = await linkTrackerApi.listLinks({
        limit,
        offset: page * limit,
        search: searchQuery || undefined,
      });
      setLinks(result.links);
      setTotal(result.total);
      emitComponentEvent(COMPONENT_ID, 'data_load_complete', {
        duration: Date.now() - startTime,
        count: result.links.length,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load links';
      setError(errorMessage);
      setLinks([]);
      emitComponentEvent(COMPONENT_ID, 'data_load_error', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLink = async () => {
    if (!newLink.url) {
      setError('URL is required');
      return;
    }

    try {
      setLoading(true);
      const link = await linkTrackerApi.createLink({
        url: newLink.url,
        customCode: newLink.customCode || undefined,
        expiresIn: newLink.expiresIn ? parseInt(newLink.expiresIn) : undefined,
        clickLimit: newLink.clickLimit ? parseInt(newLink.clickLimit) : undefined,
        generateQR: newLink.generateQR,
        tags: newLink.tags ? newLink.tags.split(',').map(t => t.trim()) : undefined,
      });
      setLinks([link, ...links]);
      setShowCreateDialog(false);
      setNewLink({
        url: '',
        customCode: '',
        expiresIn: '',
        clickLimit: '',
        generateQR: false,
        tags: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create link');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLink = async (shortCode: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return;

    try {
      await linkTrackerApi.deleteLink(shortCode);
      setLinks(links.filter(l => l.shortCode !== shortCode));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete link');
    }
  };

  const handleViewAnalytics = async (link: ShortenedURL) => {
    try {
      setLoading(true);
      const analyticsData = await linkTrackerApi.getAnalytics(link.shortCode);
      setAnalytics(analyticsData);
      setShowAnalyticsDialog(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await linkTrackerApi.exportLinks({ format: 'csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `links-export-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const isExpired = (link: ShortenedURL) => {
    return link.expiresAt ? Date.now() > link.expiresAt : false;
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-true-black-text theme-light:text-light-text theme-glass:text-glass-text">
            Link Tracker
          </h2>
          <p className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted mt-1">
            Manage and track shortened URLs
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
            Create Link
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted" />
        <input
          type="text"
          placeholder="Search links..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg text-true-black-text theme-light:text-light-text theme-glass:text-glass-text"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Links List */}
      {loading && links.length === 0 ? (
        <div className="text-center py-12 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
          Loading links...
        </div>
      ) : links.length === 0 ? (
        <div className="text-center py-12 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
          No links found. Create your first tracking link!
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div
              key={link.id}
              className="p-4 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <LinkIcon className="w-5 h-5 text-blue-500" />
                    <a
                      href={link.shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline font-mono text-sm truncate"
                    >
                      {link.shortUrl}
                    </a>
                    {isExpired(link) && (
                      <span className="px-2 py-1 bg-red-900/20 text-red-400 text-xs rounded">
                        Expired
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted truncate">
                    {link.originalUrl}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
                    <span>{link.clickCount} clicks</span>
                    <span>Created: {formatDate(link.createdAt)}</span>
                    {link.tags && link.tags.length > 0 && (
                      <span className="flex gap-1">
                        {link.tags.map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-900/20 text-blue-400 rounded">
                            {tag}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewAnalytics(link)}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 text-sm"
                  >
                    <ChartBarIcon className="w-4 h-4" />
                    Analytics
                  </button>
                  <button
                    onClick={() => handleDeleteLink(link.shortCode)}
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

      {/* Create Link Dialog */}
      <Dialog.Root open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg p-6 w-full max-w-md z-50">
            <Dialog.Title className="text-xl font-bold mb-4">Create Tracking Link</Dialog.Title>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">URL *</label>
                <input
                  type="url"
                  value={newLink.url}
                  onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                  className="w-full px-3 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Custom Code (optional)</label>
                <input
                  type="text"
                  value={newLink.customCode}
                  onChange={(e) => setNewLink({ ...newLink, customCode: e.target.value })}
                  className="w-full px-3 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                  placeholder="abc123"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Expires In (seconds)</label>
                  <input
                    type="number"
                    value={newLink.expiresIn}
                    onChange={(e) => setNewLink({ ...newLink, expiresIn: e.target.value })}
                    className="w-full px-3 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Click Limit</label>
                  <input
                    type="number"
                    value={newLink.clickLimit}
                    onChange={(e) => setNewLink({ ...newLink, clickLimit: e.target.value })}
                    className="w-full px-3 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={newLink.tags}
                  onChange={(e) => setNewLink({ ...newLink, tags: e.target.value })}
                  className="w-full px-3 py-2 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                  placeholder="campaign1, test"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newLink.generateQR}
                  onChange={(e) => setNewLink({ ...newLink, generateQR: e.target.checked })}
                  className="w-4 h-4"
                />
                <label className="text-sm">Generate QR Code</label>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowCreateDialog(false)}
                  className="px-4 py-2 border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateLink}
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
            <Dialog.Title className="text-xl font-bold mb-4">Link Analytics</Dialog.Title>
            {analytics && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary rounded">
                    <div className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">Total Clicks</div>
                    <div className="text-2xl font-bold">{analytics.clickCount}</div>
                  </div>
                  <div className="p-4 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary rounded">
                    <div className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">Short URL</div>
                    <div className="text-sm font-mono truncate">{analytics.link.shortUrl}</div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Click History</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {analytics.clicks.length === 0 ? (
                      <p className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">No clicks yet</p>
                    ) : (
                      analytics.clicks.map((click) => (
                        <div
                          key={click.id}
                          className="p-3 bg-true-black-bg-secondary theme-light:bg-light-bg-secondary theme-glass:bg-glass-bg-secondary rounded text-sm"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-mono text-xs">{click.ipAddress || 'Unknown IP'}</div>
                              <div className="text-xs text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
                                {click.country && click.city ? `${click.city}, ${click.country}` : click.country || 'Unknown location'}
                              </div>
                              {click.userAgent && (
                                <div className="text-xs text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted truncate max-w-md">
                                  {click.userAgent}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
                              {formatDate(click.timestamp)}
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

