import { ReactNode } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface RendererReactFlowProps {
  children?: ReactNode;
  nodes?: Node[];
  edges?: Edge[];
  className?: string;
  showControls?: boolean;
  showMiniMap?: boolean;
}

export default function RendererReactFlow({
  children,
  nodes: initialNodes = [],
  edges: initialEdges = [],
  className = '',
  showControls = true,
  showMiniMap = true,
}: RendererReactFlowProps) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        className="bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg"
      >
        <Background color="#1a1a1a" gap={16} />
        {showControls && (
          <Controls className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg" />
        )}
        {showMiniMap && (
          <MiniMap
            className="bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg"
            maskColor="rgba(0, 0, 0, 0.5)"
          />
        )}
        {children}
      </ReactFlow>
    </div>
  );
}

