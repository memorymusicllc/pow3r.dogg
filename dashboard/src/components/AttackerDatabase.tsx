import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Link } from 'react-router-dom';
import { UserGroupIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import FileUpload from './FileUpload';
import * as Dialog from '@radix-ui/react-dialog';

interface Attacker {
  id: string;
  fingerprint?: string;
  ipAddress?: string;
  phoneNumber?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  firstSeen: number;
  lastSeen: number;
  threatScore: number;
  aliases?: string[];
  relatedAttackers?: string[];
  evidenceIds?: string[];
  investigationIds?: string[];
}

export default function AttackerDatabase() {
  const [attackers, setAttackers] = useState<Attacker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAttacker, setSelectedAttacker] = useState<Attacker | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    loadAttackers();
  }, []);

  const loadAttackers = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<{ success: boolean; attackers: Attacker[] }>(
        '/admin/attackers'
      );
      setAttackers(response.attackers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attackers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadAttackers();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<{ success: boolean; attackers: Attacker[] }>(
        `/admin/attackers/search?q=${encodeURIComponent(searchQuery)}`
      );
      setAttackers(response.attackers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAttackerClick = (attacker: Attacker) => {
    setSelectedAttacker(attacker);
    setShowDetailsDialog(true);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getThreatColor = (score: number) => {
    if (score >= 0.8) return 'text-red-400';
    if (score >= 0.5) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-header text-3xl">Attacker Database</h2>
        <button
          onClick={() => setShowUploadDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-true-black-accent hover:bg-true-black-accent-hover rounded text-white"
        >
          <PlusIcon className="w-5 h-5" />
          Upload Research
        </button>
      </div>

      <div className="bg-true-black-surface border border-true-black-border rounded-lg p-6 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-true-black-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by fingerprint, IP, phone, or ID..."
              className="w-full pl-10 pr-4 py-2 bg-true-black-bg border border-true-black-border rounded text-true-black-text"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-true-black-accent hover:bg-true-black-accent-hover rounded text-white"
          >
            Search
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400 mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-true-black-accent mx-auto mb-4"></div>
            <p className="text-true-black-text-muted">Loading attackers...</p>
          </div>
        </div>
      ) : attackers.length === 0 ? (
        <div className="bg-true-black-surface border border-true-black-border rounded-lg p-12 text-center">
          <UserGroupIcon className="w-16 h-16 mx-auto mb-4 text-true-black-text-muted" />
          <p className="text-true-black-text-muted">No attackers found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {attackers.map((attacker) => (
            <div
              key={attacker.id}
              onClick={() => handleAttackerClick(attacker)}
              className="bg-true-black-surface border border-true-black-border rounded-lg p-6 hover:border-true-black-accent cursor-pointer transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="font-header text-xl">Attacker {attacker.id.substring(0, 8)}</h3>
                    <span className={`text-lg font-bold ${getThreatColor(attacker.threatScore)}`}>
                      Threat: {(attacker.threatScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {attacker.fingerprint && (
                      <div>
                        <div className="text-true-black-text-muted">Fingerprint</div>
                        <div className="font-mono text-xs">{attacker.fingerprint.substring(0, 16)}...</div>
                      </div>
                    )}
                    {attacker.ipAddress && (
                      <div>
                        <div className="text-true-black-text-muted">IP Address</div>
                        <div>{attacker.ipAddress}</div>
                      </div>
                    )}
                    {attacker.phoneNumber && (
                      <div>
                        <div className="text-true-black-text-muted">Phone</div>
                        <div>{attacker.phoneNumber}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-true-black-text-muted">Last Seen</div>
                      <div>{formatDate(attacker.lastSeen)}</div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/knowledge-graph/${attacker.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="px-4 py-2 bg-true-black-bg border border-true-black-border rounded text-true-black-text hover:bg-true-black-surface"
                  >
                    View Graph
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog.Root open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-true-black-surface border border-true-black-border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50">
            <Dialog.Title className="font-header text-2xl mb-4">Upload Research File</Dialog.Title>
            <FileUpload
              onUploadComplete={() => {
                setShowUploadDialog(false);
                loadAttackers();
              }}
            />
            <Dialog.Close className="absolute top-4 right-4 text-true-black-text-muted hover:text-true-black-text">
              ×
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Details Dialog */}
      <Dialog.Root open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-true-black-surface border border-true-black-border rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto z-50">
            {selectedAttacker && (
              <>
                <Dialog.Title className="font-header text-2xl mb-4">
                  Attacker Details: {selectedAttacker.id.substring(0, 8)}
                </Dialog.Title>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-true-black-text-muted">Threat Score</div>
                      <div className={`text-2xl font-bold ${getThreatColor(selectedAttacker.threatScore)}`}>
                        {(selectedAttacker.threatScore * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-true-black-text-muted">First Seen</div>
                      <div>{formatDate(selectedAttacker.firstSeen)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-true-black-text-muted">Last Seen</div>
                      <div>{formatDate(selectedAttacker.lastSeen)}</div>
                    </div>
                    {selectedAttacker.fingerprint && (
                      <div>
                        <div className="text-sm text-true-black-text-muted">Fingerprint</div>
                        <div className="font-mono text-xs break-all">{selectedAttacker.fingerprint}</div>
                      </div>
                    )}
                    {selectedAttacker.ipAddress && (
                      <div>
                        <div className="text-sm text-true-black-text-muted">IP Address</div>
                        <div>{selectedAttacker.ipAddress}</div>
                      </div>
                    )}
                    {selectedAttacker.phoneNumber && (
                      <div>
                        <div className="text-sm text-true-black-text-muted">Phone Number</div>
                        <div>{selectedAttacker.phoneNumber}</div>
                      </div>
                    )}
                  </div>

                  {selectedAttacker.aliases && selectedAttacker.aliases.length > 0 && (
                    <div>
                      <div className="text-sm text-true-black-text-muted mb-2">Aliases</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedAttacker.aliases.map((alias, i) => (
                          <span key={i} className="px-3 py-1 bg-true-black-bg rounded text-sm">
                            {alias}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedAttacker.metadata && Object.keys(selectedAttacker.metadata).length > 0 && (
                    <div>
                      <div className="text-sm text-true-black-text-muted mb-2">Metadata</div>
                      <pre className="bg-true-black-bg rounded p-4 text-xs overflow-auto">
                        {JSON.stringify(selectedAttacker.metadata, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Link
                      to={`/knowledge-graph/${selectedAttacker.id}`}
                      className="px-4 py-2 bg-true-black-accent hover:bg-true-black-accent-hover rounded text-white"
                    >
                      View Knowledge Graph
                    </Link>
                    <button
                      onClick={() => setShowUploadDialog(true)}
                      className="px-4 py-2 bg-true-black-bg border border-true-black-border rounded text-true-black-text hover:bg-true-black-surface"
                    >
                      Upload Research
                    </button>
                  </div>
                </div>
              </>
            )}
            <Dialog.Close className="absolute top-4 right-4 text-true-black-text-muted hover:text-true-black-text">
              ×
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
