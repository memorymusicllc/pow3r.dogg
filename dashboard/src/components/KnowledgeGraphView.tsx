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
import { useConfigStore } from '../stores/config-store';
import { getRenderingConfig, getThemeConfig } from '../utils/config-validator';
import { emitComponentEvent } from '../utils/observability';
import { Renderer2D, Renderer3D, RendererThreeJS } from './renderers';
import { CubeIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { Sphere, Text } from '@react-three/drei';

interface KnowledgeGraphData {
  entities: Array<{ type: string; name: string; properties: Record<string, unknown> }>;
  relationships: Array<{ source: string; target: string; type: string }>;
  facts: Array<{ subject: string; predicate: string; object: string }>;
}

interface KnowledgeGraphViewProps {
  attackerId?: string | null;
  compact?: boolean;
}

const COMPONENT_ID = 'knowledge-graph';

export default function KnowledgeGraphView({ attackerId, compact = false }: KnowledgeGraphViewProps = {}) {
  const { renderingMode, getComponentConfig, theme } = useConfigStore();
  const componentConfig = getComponentConfig(COMPONENT_ID);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<KnowledgeGraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const themeConfig = getThemeConfig(componentConfig, theme);
  const chartColors = (themeConfig?.chart_colors as string[]) || ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  const loadKnowledgeGraph = useCallback(async () => {
    if (!attackerId) {
      setError('No attacker ID provided');
      return;
    }

    const startTime = Date.now();
    setLoading(true);
    setError(null);

    try {
      emitComponentEvent(COMPONENT_ID, 'data_load_start', { attackerId });
      const response = await apiClient.get<{ success: boolean; data: KnowledgeGraphData }>(
        `/admin/knowledge-graph/${attackerId}`
      );
      setData(response.data);
      emitComponentEvent(COMPONENT_ID, 'data_load_complete', {
        duration: Date.now() - startTime,
        entities: response.data.entities.length,
        relationships: response.data.relationships.length,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load knowledge graph';
      setError(errorMessage);
      emitComponentEvent(COMPONENT_ID, 'data_load_error', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  }, [attackerId]);

  useEffect(() => {
    if (attackerId) {
      loadKnowledgeGraph();
    } else {
      setData(null);
      setNodes([]);
      setEdges([]);
    }
  }, [attackerId, loadKnowledgeGraph, setNodes, setEdges]);

  useEffect(() => {
    if (data && data.entities.length > 0) {
      // Convert entities to nodes with better positioning
      const graphNodes: Node[] = data.entities.map((entity, index) => {
        const angle = (index / data.entities.length) * 2 * Math.PI;
        const radius = compact ? 150 : 200;
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
            border: '2px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            padding: '12px',
            minWidth: '120px',
            fontWeight: '600',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
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
            labelStyle: { fill: '#3b82f6', fontWeight: 600 },
          });
        }
      });

      setNodes(graphNodes);
      setEdges(graphEdges);
    } else if (data && data.entities.length === 0) {
      setNodes([]);
      setEdges([]);
    }
  }, [data, setNodes, setEdges, compact]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const getNodeColor = (type: string): string => {
    const typeIndex = ['person', 'organization', 'location', 'email', 'phone', 'domain', 'attacker', 'device'].indexOf(type);
    if (typeIndex >= 0 && typeIndex < chartColors.length) {
      return chartColors[typeIndex];
    }
    const colors: Record<string, string> = {
      person: chartColors[0] || '#3b82f6',
      organization: chartColors[1] || '#10b981',
      location: chartColors[2] || '#f59e0b',
      email: chartColors[3] || '#8b5cf6',
      phone: chartColors[4] || '#ec4899',
      domain: chartColors[5] || '#06b6d4',
      attacker: '#ef4444',
      device: '#6b7280',
    };
    return colors[type] || '#6b7280';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-true-black-accent theme-light:border-light-accent theme-glass:border-glass-accent mx-auto mb-4"></div>
          <p className="text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">Loading knowledge graph...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-xl p-4 text-red-400 animate-fadeIn">
        {error}
      </div>
    );
  }

  if (!attackerId) {
    return (
      <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-12 text-center">
        <CubeIcon className="w-16 h-16 mx-auto mb-4 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted" />
        <p className="text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted mb-2">
          Select an attacker from the Attackers section to view their knowledge graph.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
          <InformationCircleIcon className="w-5 h-5" />
          <span>The knowledge graph shows relationships between entities, evidence, and connections.</span>
        </div>
      </div>
    );
  }

  // 2D/React Flow Rendering (default)
  const renderReactFlow = () => (
    <div className={compact ? 'space-y-3' : 'space-y-6'}>
      <div className={`bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl overflow-hidden transition-all duration-300 ${compact ? 'shadow-md' : 'shadow-lg'}`} style={{ height: compact ? '400px' : '600px' }}>
        {nodes.length > 0 ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            className="bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg"
          >
            <Background color="#1a1a1a" gap={16} />
            <Controls className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg" />
            <MiniMap 
              className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg"
              nodeColor={(node) => getNodeColor(node.data?.type || 'default')}
              maskColor="rgba(0, 0, 0, 0.5)"
            />
          </ReactFlow>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <CubeIcon className="w-16 h-16 mx-auto mb-4 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted" />
              <p className="text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
                No graph data available for this attacker
              </p>
            </div>
          </div>
        )}
      </div>

      {data && !compact && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 text-center hover:border-true-black-accent theme-light:hover:border-light-accent theme-glass:hover:border-glass-accent transition-all duration-300 hover:shadow-lg hover:scale-105 animate-fadeIn">
            <div className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted mb-2 uppercase tracking-wide">Entities</div>
            <div className="text-3xl font-bold text-true-black-text theme-light:text-light-text theme-glass:text-glass-text">{data.entities.length}</div>
          </div>
          <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 text-center hover:border-true-black-accent theme-light:hover:border-light-accent theme-glass:hover:border-glass-accent transition-all duration-300 hover:shadow-lg hover:scale-105 animate-fadeIn" style={{ animationDelay: '100ms' }}>
            <div className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted mb-2 uppercase tracking-wide">Relationships</div>
            <div className="text-3xl font-bold text-true-black-text theme-light:text-light-text theme-glass:text-glass-text">{data.relationships.length}</div>
          </div>
          <div className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-xl p-6 text-center hover:border-true-black-accent theme-light:hover:border-light-accent theme-glass:hover:border-glass-accent transition-all duration-300 hover:shadow-lg hover:scale-105 animate-fadeIn" style={{ animationDelay: '200ms' }}>
            <div className="text-sm text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted mb-2 uppercase tracking-wide">Facts</div>
            <div className="text-3xl font-bold text-true-black-text theme-light:text-light-text theme-glass:text-glass-text">{data.facts.length}</div>
          </div>
        </div>
      )}
    </div>
  );

  // 3D Rendering
  const render3D = () => {
    if (!data || data.entities.length === 0) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <CubeIcon className="w-16 h-16 mx-auto mb-4 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted" />
            <p className="text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
              No graph data available
            </p>
          </div>
        </div>
      );
    }

    return (
      <Renderer3D className="h-[600px] rounded-xl overflow-hidden">
        {data.entities.map((entity, index) => {
          const angle = (index / data.entities.length) * Math.PI * 2;
          const radius = 3;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;
          const color = getNodeColor(entity.type);
          return (
            <group key={index} position={[x, 0, z]}>
              <Sphere args={[0.3, 32, 32]}>
                <meshStandardMaterial color={color} />
              </Sphere>
              <Text
                position={[0, 0.5, 0]}
                fontSize={0.2}
                color="white"
                anchorX="center"
                anchorY="middle"
              >
                {entity.name}
              </Text>
            </group>
          );
        })}
      </Renderer3D>
    );
  };

  // ThreeJS Rendering
  const renderThreeJS = () => {
    if (!data || data.entities.length === 0) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <CubeIcon className="w-16 h-16 mx-auto mb-4 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted" />
            <p className="text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted">
              No graph data available
            </p>
          </div>
        </div>
      );
    }

    return (
      <RendererThreeJS className="h-[600px] rounded-xl overflow-hidden" environment="night">
        {data.entities.map((entity, index) => {
          const angle = (index / data.entities.length) * Math.PI * 2;
          const radius = 4;
          const x = Math.cos(angle) * radius;
          const z = Math.sin(angle) * radius;
          const y = Math.sin(index * 0.5) * 1;
          const color = getNodeColor(entity.type);
          return (
            <group key={index} position={[x, y, z]}>
              <Sphere args={[0.4, 32, 32]}>
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
              </Sphere>
              <Text
                position={[0, 0.7, 0]}
                fontSize={0.25}
                color="white"
                anchorX="center"
                anchorY="middle"
              >
                {entity.name}
              </Text>
            </group>
          );
        })}
      </RendererThreeJS>
    );
  };

  // Render based on mode
  const canRender3D = getRenderingConfig(componentConfig, '3d');
  const canRenderFlow = getRenderingConfig(componentConfig, 'react_flow');
  const canRenderThreeJS = getRenderingConfig(componentConfig, 'threejs');

  if (renderingMode === '3d' && canRender3D) {
    return render3D();
  }
  if (renderingMode === 'threejs' && canRenderThreeJS) {
    return renderThreeJS();
  }
  // Default to React Flow (2D canvas)
  if (renderingMode === 'react_flow' && canRenderFlow) {
    return <Renderer2D>{renderReactFlow()}</Renderer2D>;
  }
  // Fallback to 2D
  return <Renderer2D>{renderReactFlow()}</Renderer2D>;
}
