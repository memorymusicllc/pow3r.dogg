import { useState, useEffect } from 'react';
import { apiClient, mcpClient } from '../api/client';
import { useConfigStore } from '../stores/config-store';
import { getRenderingConfig } from '../utils/config-validator';
import { emitComponentEvent } from '../utils/observability';
import { Renderer2D, Renderer3D, RendererReactFlow } from './renderers';
import FileUpload from './FileUpload';
import {
  DocumentTextIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import * as Dialog from '@radix-ui/react-dialog';
import type { Node, Edge } from 'reactflow';

interface EvidenceItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: number;
  source: string;
  metadata?: Record<string, unknown>;
  fileUrl?: string;
}

const COMPONENT_ID = 'evidence-timeline';

export default function EvidenceTimeline() {
  const { renderingMode, getComponentConfig } = useConfigStore();
  const componentConfig = getComponentConfig(COMPONENT_ID);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadEvidence();
  }, []);

  const loadEvidence = async () => {
    const startTime = Date.now();
    setLoading(true);
    setError(null);

    try {
      emitComponentEvent(COMPONENT_ID, 'data_load_start', {});
      const response = await apiClient.get<{ success: boolean; evidence?: EvidenceItem[] }>(
        '/admin/evidence'
      );
      setEvidence(response.evidence || []);
      emitComponentEvent(COMPONENT_ID, 'data_load_complete', {
        duration: Date.now() - startTime,
        count: response.evidence?.length || 0,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load evidence';
      setError(errorMessage);
      setEvidence([]);
      emitComponentEvent(COMPONENT_ID, 'data_load_error', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    // Client-side filtering for now
    // In production, this would be server-side
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getEvidenceTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      communication: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      file: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      screenshot: 'bg-green-500/20 text-green-400 border-green-500/30',
      log: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      other: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return colors[type] || colors.other;
  };

  const filteredEvidence = evidence.filter((item) => {
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const sortedEvidence = [...filteredEvidence].sort((a, b) => b.timestamp - a.timestamp);

  const exportEvidence = async () => {
    if (evidence.length === 0) {
      setError('No evidence to export');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      emitComponentEvent(COMPONENT_ID, 'export_start', { count: evidence.length });

      // Try MCP tool first
      const mcpResult = await mcpClient.callTool<{
        success: boolean;
        package: {
          caseId?: string;
          evidenceIds: string[];
          exportedBy?: string;
          exportDate?: string;
          downloadUrl?: string;
          packageId?: string;
        };
      }>('evidence_export_bundle', {
        caseId: `case-${Date.now()}`,
        evidenceIds: evidence.map((e) => e.id),
        exportedBy: 'system',
      });

      if (mcpResult.success && mcpResult.data?.package) {
        const packageData = mcpResult.data.package;
        if (packageData.downloadUrl) {
          window.open(packageData.downloadUrl, '_blank');
          emitComponentEvent(COMPONENT_ID, 'export_complete', {
            packageId: packageData.packageId,
            count: packageData.evidenceIds.length,
          });
        } else {
          // Fallback to REST API if no download URL
          throw new Error('MCP export succeeded but no download URL provided');
        }
      } else {
        // Fallback to REST API if MCP fails
        throw new Error(mcpResult.error || 'MCP export failed');
      }
    } catch (mcpErr) {
      // Fallback to REST API
      try {
        const response = await apiClient.post<{ success: boolean; downloadUrl?: string }>(
          '/admin/evidence/export',
          { evidenceIds: evidence.map((e) => e.id) }
        );
        if (response.downloadUrl) {
          window.open(response.downloadUrl, '_blank');
          emitComponentEvent(COMPONENT_ID, 'export_complete', { count: evidence.length });
        } else {
          setError('Export succeeded but no download URL provided');
        }
      } catch (restErr) {
        const errorMessage = restErr instanceof Error ? restErr.message : 'Export failed';
        setError(errorMessage);
        emitComponentEvent(COMPONENT_ID, 'export_error', { error: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  const evidenceTypes = ['all', 'communication', 'file', 'screenshot', 'log', 'other'];

  // 2D Rendering (default)
  const render2D = () => (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowUploadDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-true-black-accent theme-light:bg-light-accent theme-glass:bg-glass-accent hover:opacity-90 rounded-lg text-white transition-all duration-200"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Upload Evidence</span>
          </button>
          <button
            onClick={exportEvidence}
            className="flex items-center gap-2 px-4 py-2 bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border hover:bg-true-black-bg theme-light:hover:bg-light-bg theme-glass:hover:bg-glass-bg rounded-lg text-true-black-text theme-light:text-light-text theme-glass:text-glass-text transition-all duration-200"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            <span>Export</span>
          </button>
        </div>
          </div>

      {/* Search and Filter */}
      <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search evidence..."
              className="w-full pl-10 pr-4 py-2 bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg text-true-black-text theme-light:text-light-text theme-glass:text-glass-text focus:outline-none focus:ring-2 focus:ring-true-black-accent theme-light:focus:ring-light-accent theme-glass:focus:ring-glass-accent"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg text-true-black-text theme-light:text-light-text theme-glass:text-glass-text focus:outline-none focus:ring-2 focus:ring-true-black-accent theme-light:focus:ring-light-accent theme-glass:focus:ring-glass-accent"
          >
            {evidenceTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
          </div>

          {error && (
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400 animate-fadeIn">
              {error}
            </div>
          )}

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-true-black-accent theme-light:border-light-accent theme-glass:border-glass-accent mx-auto mb-4"></div>
            <p className="text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">Loading evidence...</p>
          </div>
        </div>
      ) : sortedEvidence.length === 0 ? (
        <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-12 text-center">
          <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted" />
          <p className="text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
            {searchQuery || filterType !== 'all' ? 'No evidence found matching your criteria' : 'No evidence found'}
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-true-black-border theme-light:bg-light-border theme-glass:bg-glass-border"></div>

          {/* Timeline Items */}
          <div className="space-y-6">
            {sortedEvidence.map((item, index) => (
              <div
                key={item.id}
                className="relative flex gap-4 animate-fadeIn"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Timeline Dot */}
                <div className="relative z-10 flex-shrink-0">
                  <div className={`w-4 h-4 rounded-full border-2 border-true-black-border theme-light:border-light-border theme-glass:border-glass-border bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface ${getEvidenceTypeColor(item.type).split(' ')[1]}`}></div>
                </div>

                {/* Evidence Card */}
                <div className="flex-1 bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 hover:border-true-black-accent theme-light:hover:border-light-accent theme-glass:hover:border-glass-accent transition-all duration-300 hover:shadow-lg">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getEvidenceTypeColor(item.type)}`}>
                        {item.type}
                      </span>
                      <h3 className="font-header text-lg">{item.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
                      <CalendarIcon className="w-4 h-4" />
                      <span>{formatDate(item.timestamp)}</span>
                    </div>
              </div>

                  {item.description && (
                    <p className="text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted mb-4">
                      {item.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
                      Source: <span className="text-true-black-text theme-light:text-light-text theme-glass:text-glass-text font-medium">{item.source}</span>
                    </span>
                    {item.fileUrl && (
                      <a
                        href={item.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                        className="text-true-black-accent theme-light:text-light-accent theme-glass:text-glass-accent hover:underline"
                  >
                        View File
                  </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
            </div>
          )}

      {/* Upload Dialog */}
      <Dialog.Root open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50">
            <Dialog.Title className="font-header text-2xl mb-4">Upload Evidence</Dialog.Title>
            <FileUpload
              onUploadComplete={() => {
                setShowUploadDialog(false);
                loadEvidence();
              }}
            />
            <Dialog.Close className="absolute top-4 right-4 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted hover:text-true-black-text theme-light:hover:text-light-text theme-glass:hover:text-glass-text text-2xl">
              ×
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );

  // 3D Rendering
  const render3D = () => {
    if (sortedEvidence.length === 0) {
      return (
        <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-12 text-center">
          <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted" />
          <p className="text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
            No evidence found
          </p>
        </div>
      );
    }

    return (
      <Renderer3D className="h-[600px] rounded-xl overflow-hidden">
        {sortedEvidence.slice(0, 20).map((item, index) => {
          const x = (index % 5) * 1.5 - 3;
          const z = Math.floor(index / 5) * 1.5;
          const y = (item.timestamp / 1000000000000) * 0.1;
          const color = item.type === 'communication' ? '#3b82f6' : item.type === 'file' ? '#8b5cf6' : item.type === 'screenshot' ? '#10b981' : '#f59e0b';
          return (
            <group key={item.id} position={[x, y, z]}>
              <mesh>
                <boxGeometry args={[0.3, 0.3, 0.3]} />
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
    const nodes: Node[] = sortedEvidence.slice(0, 30).map((item, index) => ({
      id: item.id,
      type: 'default',
      position: {
        x: (index % 6) * 200,
        y: Math.floor(index / 6) * 150,
      },
      data: {
        label: `${item.title}\n${item.type}\n${formatDate(item.timestamp)}`,
      },
      style: {
        background: item.type === 'communication' ? '#3b82f6' : item.type === 'file' ? '#8b5cf6' : item.type === 'screenshot' ? '#10b981' : '#f59e0b',
        color: '#fff',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '10px',
        minWidth: '150px',
      },
    }));

    const edges: Edge[] = sortedEvidence
      .slice(0, 29)
      .map((item, index) => ({
        id: `${item.id}-${sortedEvidence[index + 1]?.id}`,
        source: item.id,
        target: sortedEvidence[index + 1]?.id || item.id,
        animated: true,
      }))
      .filter((edge) => edge.target !== edge.source);

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
