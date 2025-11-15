import { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { apiClient } from '../api/client';
import { CubeIcon } from '@heroicons/react/24/outline';

interface KnowledgeGraphData {
  entities: Array<{ type: string; name: string; properties: Record<string, unknown> }>;
  relationships: Array<{ source: string; target: string; type: string }>;
  facts: Array<{ subject: string; predicate: string; object: string }>;
}

interface KnowledgeGraphViewProps {
  attackerId?: string | null;
}

export default function KnowledgeGraphView({ attackerId }: KnowledgeGraphViewProps = {}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<KnowledgeGraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const loadKnowledgeGraph = useCallback(async () => {
    if (!attackerId) {
      setError('No attacker ID provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<{ success: boolean; data: KnowledgeGraphData }>(
        `/admin/knowledge-graph/${attackerId}`
      );
      setData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load knowledge graph');
    } finally {
      setLoading(false);
    }
  }, [attackerId]);

  useEffect(() => {
    if (attackerId) {
      loadKnowledgeGraph();
    }
  }, [attackerId, loadKnowledgeGraph]);

  useEffect(() => {
    if (data && data.entities.length > 0) {
      // Convert entities to nodes with better positioning
      const graphNodes: Node[] = data.entities.map((entity, index) => {
        const angle = (index / data.entities.length) * 2 * Math.PI;
        const radius = 200;
        return {
          id: `entity-${index}`,
          type: 'default',
          position: {
            x: 400 + radius * Math.cos(angle),
            y: 300 + radius * Math.sin(angle),
          },
          data: {
            label: entity.name,
            type: entity.type,
            ...entity.properties,
          },
          style: {
            background: getNodeColor(entity.type),
            color: '#fff',
            border: '1px solid #333',
            borderRadius: '8px',
            padding: '10px',
            minWidth: '120px',
          },
        };
      });

      // Convert relationships to edges
      const graphEdges: Edge[] = [];
      data.relationships.forEach((rel, index) => {
        const sourceIndex = data.entities.findIndex((e) => e.name === rel.source);
        const targetIndex = data.entities.findIndex((e) => e.name === rel.target);
        
        if (sourceIndex !== -1 && targetIndex !== -1) {
          graphEdges.push({
            id: `edge-${index}`,
            source: `entity-${sourceIndex}`,
            target: `entity-${targetIndex}`,
            label: rel.type,
            style: { stroke: '#3b82f6', strokeWidth: 2 },
            animated: true,
          });
        }
      });

      setNodes(graphNodes);
      setEdges(graphEdges);
    } else if (data && data.entities.length === 0) {
      setNodes([]);
      setEdges([]);
    }
  }, [data, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const getNodeColor = (type: string): string => {
    const colors: Record<string, string> = {
      person: '#3b82f6',
      organization: '#10b981',
      location: '#f59e0b',
      email: '#8b5cf6',
      phone: '#ec4899',
      domain: '#06b6d4',
    };
    return colors[type] || '#6b7280';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-true-black-accent mx-auto mb-4"></div>
          <p className="text-true-black-text-muted">Loading knowledge graph...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-400">
        {error}
      </div>
    );
  }

  if (!attackerId) {
    return (
      <div>
        <h2 className="font-header text-3xl mb-6">Knowledge Graph</h2>
        <p className="text-true-black-text-muted">Please select an attacker to view their knowledge graph.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-header text-3xl">Knowledge Graph</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('2d')}
            className={`px-4 py-2 rounded ${
              viewMode === '2d'
                ? 'bg-true-black-accent text-white'
                : 'bg-true-black-surface border border-true-black-border text-true-black-text'
            }`}
          >
            2D View
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`px-4 py-2 rounded ${
              viewMode === '3d'
                ? 'bg-true-black-accent text-white'
                : 'bg-true-black-surface border border-true-black-border text-true-black-text'
            }`}
          >
            3D View
          </button>
        </div>
      </div>

      {viewMode === '2d' ? (
        <div className="bg-true-black-surface border border-true-black-border rounded-lg" style={{ height: '600px' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      ) : (
        <div className="bg-true-black-surface border border-true-black-border rounded-lg p-6" style={{ height: '600px' }}>
          <Graph3D nodes={nodes} edges={edges} />
        </div>
      )}

      {data && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-true-black-surface border border-true-black-border rounded-lg p-4">
            <div className="text-sm text-true-black-text-muted">Entities</div>
            <div className="text-2xl font-bold">{data.entities.length}</div>
          </div>
          <div className="bg-true-black-surface border border-true-black-border rounded-lg p-4">
            <div className="text-sm text-true-black-text-muted">Relationships</div>
            <div className="text-2xl font-bold">{data.relationships.length}</div>
          </div>
          <div className="bg-true-black-surface border border-true-black-border rounded-lg p-4">
            <div className="text-sm text-true-black-text-muted">Facts</div>
            <div className="text-2xl font-bold">{data.facts.length}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// 3D Graph Component using ThreeJS
function Graph3D(_props: { nodes: Node[]; edges: Edge[] }) {
  return (
    <div className="flex items-center justify-center h-full text-true-black-text-muted">
      <div className="text-center">
        <CubeIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>3D visualization coming soon</p>
        <p className="text-sm mt-2">ThreeJS integration in progress</p>
      </div>
    </div>
  );
}
