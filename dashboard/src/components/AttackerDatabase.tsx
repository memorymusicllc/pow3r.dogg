import { useState, useEffect } from 'react';
import { apiClient, mcpClient } from '../api/client';
import { useConfigStore } from '../stores/config-store';
import { getRenderingConfig } from '../utils/config-validator';
import { emitComponentEvent } from '../utils/observability';
import { Renderer2D, Renderer3D, RendererReactFlow } from './renderers';
import { UserGroupIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import FileUpload from './FileUpload';
import * as Dialog from '@radix-ui/react-dialog';
import type { Node, Edge } from 'reactflow';

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

interface AttackerDatabaseProps {
  onAttackerSelect?: (attackerId: string) => void;
}

const COMPONENT_ID = 'attacker-database';

export default function AttackerDatabase({ onAttackerSelect }: AttackerDatabaseProps = {}) {
  const { renderingMode, getComponentConfig } = useConfigStore();
  const componentConfig = getComponentConfig(COMPONENT_ID);
  const [attackers, setAttackers] = useState<Attacker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAttacker, setSelectedAttacker] = useState<Attacker | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAttacker, setEditingAttacker] = useState<Partial<Attacker>>({
    fingerprint: '',
    ipAddress: '',
    phoneNumber: '',
    userAgent: '',
    threatScore: 0.5,
    aliases: [],
    metadata: {},
  });

  useEffect(() => {
    loadAttackers();
  }, []);

  const loadAttackers = async () => {
    const startTime = Date.now();
    setLoading(true);
    setError(null);

    try {
      emitComponentEvent(COMPONENT_ID, 'data_load_start', {});
      const response = await apiClient.get<{ success: boolean; attackers?: Attacker[] }>(
        '/admin/attackers'
      );
      setAttackers(response.attackers || []);
      emitComponentEvent(COMPONENT_ID, 'data_load_complete', {
        duration: Date.now() - startTime,
        count: response.attackers?.length || 0,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load attackers';
      setError(errorMessage);
      setAttackers([]);
      emitComponentEvent(COMPONENT_ID, 'data_load_error', { error: errorMessage });
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
      // Try MCP tool first for fingerprint/IP/phone queries
      // Check if query looks like fingerprint (long hex), IP (IPv4/IPv6), or phone
      const isFingerprint = /^[a-f0-9]{32,}$/i.test(searchQuery.trim());
      const isIP = /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i.test(searchQuery.trim());
      const isPhone = /^\+?[\d\s\-\(\)]{10,}$/.test(searchQuery.trim());

      if (isFingerprint || isIP || isPhone) {
        // Use MCP tool for targeted queries
        const mcpArgs: Record<string, string> = {};
        if (isFingerprint) {
          mcpArgs.fingerprint = searchQuery.trim();
        } else if (isIP) {
          mcpArgs.ip = searchQuery.trim();
        } else if (isPhone) {
          mcpArgs.phone = searchQuery.trim();
        }

        const mcpResult = await mcpClient.callTool<{ success: boolean; results: unknown[]; count: number }>(
          'defender_query_attacker',
          mcpArgs
        );

        if (mcpResult.success && mcpResult.data) {
          // Transform MCP results to Attacker format
          // MCP returns beacons, we need to convert them to attacker profiles
          const results = mcpResult.data.results || [];
          if (results.length > 0) {
            // For now, use REST API to get full attacker profiles from the results
            // This is a hybrid approach: MCP for discovery, REST for full data
            const response = await apiClient.get<{ success: boolean; attackers?: Attacker[] }>(
              `/admin/attackers/search?q=${encodeURIComponent(searchQuery)}`
            );
            setAttackers(response.attackers || []);
          } else {
            setAttackers([]);
          }
        } else {
          // Fallback to REST API if MCP fails
          throw new Error(mcpResult.error || 'MCP query failed');
        }
      } else {
        // Use REST API for text-based searches
        const response = await apiClient.get<{ success: boolean; attackers?: Attacker[] }>(
          `/admin/attackers/search?q=${encodeURIComponent(searchQuery)}`
        );
        setAttackers(response.attackers || []);
      }
    } catch (err) {
      // If MCP fails, fallback to REST API
      try {
        const response = await apiClient.get<{ success: boolean; attackers?: Attacker[] }>(
          `/admin/attackers/search?q=${encodeURIComponent(searchQuery)}`
        );
        setAttackers(response.attackers || []);
      } catch (restErr) {
        setError(restErr instanceof Error ? restErr.message : 'Search failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAttackerClick = (attacker: Attacker) => {
    setSelectedAttacker(attacker);
    setEditingAttacker({
      fingerprint: attacker.fingerprint || '',
      ipAddress: attacker.ipAddress || '',
      phoneNumber: attacker.phoneNumber || '',
      userAgent: attacker.userAgent || '',
      threatScore: attacker.threatScore || 0.5,
      aliases: attacker.aliases || [],
      metadata: attacker.metadata || {},
    });
    setShowDetailsDialog(true);
    emitComponentEvent(COMPONENT_ID, 'attacker_selected', { attackerId: attacker.id });
    if (onAttackerSelect) {
      onAttackerSelect(attacker.id);
    }
  };

  const handleEdit = () => {
    setShowDetailsDialog(false);
    setShowCreateDialog(true);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getThreatColor = (score: number) => {
    if (score >= 0.8) return 'text-red-400';
    if (score >= 0.5) return 'text-yellow-400';
    return 'text-green-400';
  };

  // 2D Rendering (default)
  const render2D = () => (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="font-header text-2xl">Attacker Database</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setEditingAttacker({
                fingerprint: '',
                ipAddress: '',
                phoneNumber: '',
                userAgent: '',
                threatScore: 0.5,
                aliases: [],
                metadata: {},
              });
              setSelectedAttacker(null);
              setShowCreateDialog(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-true-black-accent theme-light:bg-light-accent theme-glass:bg-glass-accent hover:opacity-90 rounded-lg text-white font-medium transition-all duration-200"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add Attacker</span>
          </button>
          <button
            onClick={() => setShowUploadDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border hover:bg-true-black-bg theme-light:hover:bg-light-bg theme-glass:hover:bg-glass-bg rounded-lg text-true-black-text theme-light:text-light-text theme-glass:text-glass-text font-medium transition-all duration-200"
          >
            <span>Upload Research</span>
          </button>
        </div>
      </div>

      <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-4 mb-6 max-w-[520px] mx-auto w-full">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by fingerprint, IP, phone, or ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg text-true-black-text theme-light:text-light-text theme-glass:text-glass-text focus:outline-none focus:ring-2 focus:ring-true-black-accent theme-light:focus:ring-light-accent theme-glass:focus:ring-glass-accent"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-2.5 bg-true-black-accent theme-light:bg-light-accent theme-glass:bg-glass-accent hover:opacity-90 rounded-lg text-white font-medium transition-all duration-200"
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
        <div className="grid grid-cols-1 gap-4">
          {attackers.map((attacker, index) => (
            <div
              key={attacker.id}
              onClick={() => handleAttackerClick(attacker)}
              className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 hover:border-true-black-accent theme-light:hover:border-light-accent theme-glass:hover:border-glass-accent cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.01] max-w-[520px] mx-auto w-full animate-fadeIn"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h3 className="font-header text-xl text-true-black-text theme-light:text-light-text theme-glass:text-glass-text">
                      Attacker {attacker.id.substring(0, 8)}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold border ${
                      attacker.threatScore >= 0.8
                        ? 'text-red-400 border-red-500/30 bg-red-500/10'
                        : attacker.threatScore >= 0.5
                        ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
                        : 'text-green-400 border-green-500/30 bg-green-500/10'
                    }`}>
                      {(attacker.threatScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {attacker.fingerprint && (
                      <div className="bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg rounded-lg p-3">
                        <div className="text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted text-xs mb-1">Fingerprint</div>
                        <div className="font-mono text-xs text-true-black-text theme-light:text-light-text theme-glass:text-glass-text truncate">{attacker.fingerprint.substring(0, 24)}...</div>
                      </div>
                    )}
                    {attacker.ipAddress && (
                      <div className="bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg rounded-lg p-3">
                        <div className="text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted text-xs mb-1">IP Address</div>
                        <div className="text-true-black-text theme-light:text-light-text theme-glass:text-glass-text">{attacker.ipAddress}</div>
                      </div>
                    )}
                    {attacker.phoneNumber && (
                      <div className="bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg rounded-lg p-3">
                        <div className="text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted text-xs mb-1">Phone</div>
                        <div className="text-true-black-text theme-light:text-light-text theme-glass:text-glass-text">{attacker.phoneNumber}</div>
                      </div>
                    )}
                    <div className="bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg rounded-lg p-3">
                      <div className="text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted text-xs mb-1">Last Seen</div>
                      <div className="text-true-black-text theme-light:text-light-text theme-glass:text-glass-text text-xs">{formatDate(attacker.lastSeen)}</div>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAttackerClick(attacker);
                    }}
                    className="px-4 py-2 bg-true-black-accent theme-light:bg-light-accent theme-glass:bg-glass-accent hover:opacity-90 rounded-lg text-white text-sm font-medium transition-all duration-200"
                  >
                    View Details
                  </button>
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
                    <button
                      onClick={() => {
                        setShowDetailsDialog(false);
                        // Scroll to knowledge graph section - handled by parent
                      }}
                      className="px-4 py-2 bg-true-black-accent theme-light:bg-light-accent theme-glass:bg-glass-accent hover:opacity-90 rounded-lg text-white font-medium transition-all duration-200"
                    >
                      View Knowledge Graph
                    </button>
                    <button
                      onClick={handleEdit}
                      className="px-4 py-2 bg-true-black-bg border border-true-black-border rounded text-true-black-text hover:bg-true-black-surface"
                    >
                      Edit
                    </button>
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

      {/* Create/Edit Attacker Dialog */}
      <Dialog.Root open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-true-black-surface border border-true-black-border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50">
            <Dialog.Title className="font-header text-2xl mb-4">
              {selectedAttacker ? 'Edit Attacker' : 'Create New Attacker'}
            </Dialog.Title>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                setError(null);

                try {
                  if (selectedAttacker) {
                    // Update existing
                    const response = await apiClient.post<{ success: boolean; attacker: Attacker }>(
                      `/admin/attackers/${selectedAttacker.id}`,
                      editingAttacker
                    );
                    setSelectedAttacker(response.attacker);
                  } else {
                    // Create new
                    const response = await apiClient.post<{ success: boolean; attacker: Attacker }>(
                      '/admin/attackers',
                      editingAttacker
                    );
                    setAttackers([response.attacker, ...attackers]);
                  }
                  setShowCreateDialog(false);
                  loadAttackers();
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to save attacker');
                } finally {
                  setLoading(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-2">Fingerprint</label>
                <input
                  type="text"
                  value={editingAttacker.fingerprint || ''}
                  onChange={(e) => setEditingAttacker({ ...editingAttacker, fingerprint: e.target.value })}
                  className="w-full px-4 py-2 bg-true-black-bg border border-true-black-border rounded text-true-black-text"
                  placeholder="Device fingerprint"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">IP Address</label>
                <input
                  type="text"
                  value={editingAttacker.ipAddress || ''}
                  onChange={(e) => setEditingAttacker({ ...editingAttacker, ipAddress: e.target.value })}
                  className="w-full px-4 py-2 bg-true-black-bg border border-true-black-border rounded text-true-black-text"
                  placeholder="192.168.1.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Phone Number</label>
                <input
                  type="text"
                  value={editingAttacker.phoneNumber || ''}
                  onChange={(e) => setEditingAttacker({ ...editingAttacker, phoneNumber: e.target.value })}
                  className="w-full px-4 py-2 bg-true-black-bg border border-true-black-border rounded text-true-black-text"
                  placeholder="+1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">User Agent</label>
                <input
                  type="text"
                  value={editingAttacker.userAgent || ''}
                  onChange={(e) => setEditingAttacker({ ...editingAttacker, userAgent: e.target.value })}
                  className="w-full px-4 py-2 bg-true-black-bg border border-true-black-border rounded text-true-black-text"
                  placeholder="Mozilla/5.0..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Threat Score (0.0 - 1.0)</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={editingAttacker.threatScore || 0.5}
                  onChange={(e) => setEditingAttacker({ ...editingAttacker, threatScore: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 bg-true-black-bg border border-true-black-border rounded text-true-black-text"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Aliases (comma-separated)</label>
                <input
                  type="text"
                  value={Array.isArray(editingAttacker.aliases) ? editingAttacker.aliases.join(', ') : ''}
                  onChange={(e) => setEditingAttacker({ 
                    ...editingAttacker, 
                    aliases: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                  })}
                  className="w-full px-4 py-2 bg-true-black-bg border border-true-black-border rounded text-true-black-text"
                  placeholder="alias1, alias2, alias3"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-true-black-accent hover:bg-true-black-accent-hover rounded text-white disabled:opacity-50"
                >
                  {loading ? 'Saving...' : selectedAttacker ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateDialog(false)}
                  className="px-4 py-2 bg-true-black-bg border border-true-black-border rounded text-true-black-text hover:bg-true-black-surface"
                >
                  Cancel
                </button>
              </div>
            </form>
            <Dialog.Close className="absolute top-4 right-4 text-true-black-text-muted hover:text-true-black-text">
              ×
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );

  // 3D Rendering
  const render3D = () => {
    if (attackers.length === 0) {
      return (
        <div className="bg-true-black-surface border border-true-black-border rounded-lg p-12 text-center">
          <UserGroupIcon className="w-16 h-16 mx-auto mb-4 text-true-black-text-muted" />
          <p className="text-true-black-text-muted">No attackers found</p>
        </div>
      );
    }

    return (
      <Renderer3D className="h-[600px] rounded-xl overflow-hidden">
        {attackers.slice(0, 10).map((attacker, index) => {
          const angle = (index / attackers.length) * Math.PI * 2;
          const radius = 3;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;
          const height = attacker.threatScore * 2;
          const color = attacker.threatScore >= 0.8 ? '#ef4444' : attacker.threatScore >= 0.5 ? '#f59e0b' : '#10b981';
          return (
            <group key={attacker.id} position={[x, 0, z]}>
              <mesh position={[0, height / 2, 0]}>
                <boxGeometry args={[0.5, height, 0.5]} />
                <meshStandardMaterial color={color} />
              </mesh>
            </group>
          );
        })}
      </Renderer3D>
    );
  };

  // React Flow Rendering
  const renderReactFlow = () => {
    const nodes: Node[] = attackers.slice(0, 20).map((attacker, index) => ({
      id: attacker.id,
      type: 'default',
      position: {
        x: (index % 5) * 200,
        y: Math.floor(index / 5) * 150,
      },
      data: {
        label: `Attacker ${attacker.id.substring(0, 8)}\nThreat: ${(attacker.threatScore * 100).toFixed(0)}%`,
      },
      style: {
        background: attacker.threatScore >= 0.8 ? '#ef4444' : attacker.threatScore >= 0.5 ? '#f59e0b' : '#10b981',
        color: '#fff',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '10px',
      },
    }));

    const edges: Edge[] = attackers
      .slice(0, 20)
      .filter((a) => a.relatedAttackers && a.relatedAttackers.length > 0)
      .flatMap((attacker) =>
        attacker.relatedAttackers!.slice(0, 3).map((relatedId) => ({
          id: `${attacker.id}-${relatedId}`,
          source: attacker.id,
          target: relatedId,
          animated: true,
        }))
      );

    return (
      <RendererReactFlow
        className="h-[600px] rounded-xl overflow-hidden"
        nodes={nodes}
        edges={edges}
      />
    );
  };

  // Render based on mode
  const canRender3D = getRenderingConfig(componentConfig, '3d');
  const canRenderFlow = getRenderingConfig(componentConfig, 'react_flow');

  if (renderingMode === '3d' && canRender3D) {
    return render3D();
  }
  if (renderingMode === 'react_flow' && canRenderFlow) {
    return renderReactFlow();
  }
  // Default to 2D
  return <Renderer2D>{render2D()}</Renderer2D>;
}
