import { useConfigStore } from '../stores/config-store';
import type { RenderingMode } from '../config/pow3r-config';
import {
  Squares2X2Icon,
  CubeIcon,
  ShareIcon,
  CubeTransparentIcon,
} from '@heroicons/react/24/outline';

const renderingModes: Array<{
  id: RenderingMode;
  label: string;
  icon: typeof Squares2X2Icon;
  description: string;
}> = [
  {
    id: '2d',
    label: '2D',
    icon: Squares2X2Icon,
    description: 'Traditional 2D interface',
  },
  {
    id: '3d',
    label: '3D',
    icon: CubeIcon,
    description: '3D visualizations with React Three Fiber',
  },
  {
    id: 'react_flow',
    label: 'Flow',
    icon: ShareIcon,
    description: 'React Flow canvas diagrams',
  },
  {
    id: 'threejs',
    label: '3JS',
    icon: CubeTransparentIcon,
    description: 'Advanced ThreeJS visualizations',
  },
];

export default function RenderingModeSwitcher() {
  const { renderingMode, setRenderingMode } = useConfigStore();

  return (
    <div className="flex items-center gap-2 bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg p-1">
      {renderingModes.map((mode) => {
        const Icon = mode.icon;
        const isActive = renderingMode === mode.id;
        return (
          <button
            key={mode.id}
            onClick={() => setRenderingMode(mode.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
              isActive
                ? 'bg-true-black-accent theme-light:bg-light-accent theme-glass:bg-glass-accent text-white'
                : 'text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted hover:text-true-black-text theme-light:hover:text-light-text theme-glass:hover:text-glass-text'
            }`}
            title={mode.description}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}

