import { useState } from 'react';
import { useConfigStore } from '../stores/config-store';
import { getRenderingConfig } from '../utils/config-validator';
import { emitComponentEvent } from '../utils/observability';
import { Renderer2D, RendererReactFlow } from './renderers';
import EmailLookup from './EmailLookup';
import ImageLookup from './ImageLookup';
import AddressLookup from './AddressLookup';
import BusinessLookup from './BusinessLookup';
import {
  EnvelopeIcon,
  PhotoIcon,
  MapPinIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import type { Node, Edge } from 'reactflow';

type LookupType = 'email' | 'image' | 'address' | 'business';

interface LookupTab {
  id: LookupType;
  label: string;
  icon: typeof EnvelopeIcon;
  component: React.ReactNode;
}

const COMPONENT_ID = 'osint-lookup-panel';

export default function OSINTLookupPanel() {
  const { renderingMode, getComponentConfig } = useConfigStore();
  const componentConfig = getComponentConfig(COMPONENT_ID);
  const [activeTab, setActiveTab] = useState<LookupType>('email');

  const tabs: LookupTab[] = [
    { id: 'email', label: 'Email', icon: EnvelopeIcon, component: <EmailLookup /> },
    { id: 'image', label: 'Image', icon: PhotoIcon, component: <ImageLookup /> },
    { id: 'address', label: 'Address', icon: MapPinIcon, component: <AddressLookup /> },
    { id: 'business', label: 'Business', icon: BuildingOfficeIcon, component: <BusinessLookup /> },
  ];

  const handleTabChange = (tabId: LookupType) => {
    setActiveTab(tabId);
    emitComponentEvent(COMPONENT_ID, 'tab_changed', { tab: tabId });
  };

  // 2D Rendering (default)
  const render2D = () => (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-true-black-border theme-light:border-light-border theme-glass:border-glass-border pb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-true-black-accent theme-light:bg-light-accent theme-glass:bg-glass-accent text-white shadow-lg scale-105'
                  : 'bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted hover:bg-true-black-bg theme-light:hover:bg-light-bg theme-glass:hover:bg-glass-bg hover:text-true-black-text theme-light:hover:text-light-text theme-glass:hover:text-glass-text'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      <div className="animate-fadeIn">
        {tabs.find((tab) => tab.id === activeTab)?.component}
      </div>
    </div>
  );

  // React Flow Rendering (Workflow View)
  const renderReactFlow = () => {
    const nodes: Node[] = [
      { id: 'start', type: 'default', position: { x: 100, y: 200 }, data: { label: 'OSINT Lookup Start' } },
      ...tabs.map((tab, index) => ({
        id: tab.id,
        type: 'default',
        position: { x: 300 + (index % 2) * 300, y: 100 + Math.floor(index / 2) * 200 },
        data: { label: tab.label },
      })),
      { id: 'results', type: 'default', position: { x: 900, y: 200 }, data: { label: 'Results' } },
    ];

    const edges: Edge[] = [
      { id: 'start-email', source: 'start', target: 'email', animated: true },
      { id: 'start-image', source: 'start', target: 'image', animated: true },
      { id: 'start-address', source: 'start', target: 'address', animated: true },
      { id: 'start-business', source: 'start', target: 'business', animated: true },
      { id: 'email-results', source: 'email', target: 'results', animated: true },
      { id: 'image-results', source: 'image', target: 'results', animated: true },
      { id: 'address-results', source: 'address', target: 'results', animated: true },
      { id: 'business-results', source: 'business', target: 'results', animated: true },
    ];

    return (
      <RendererReactFlow
        className="h-[600px] rounded-xl overflow-hidden"
        nodes={nodes}
        edges={edges}
      />
    );
  };

  // Render based on mode
  const canRenderFlow = getRenderingConfig(componentConfig, 'react_flow');

  if (renderingMode === 'react_flow' && canRenderFlow) {
    return renderReactFlow();
  }
  // Default to 2D
  return <Renderer2D>{render2D()}</Renderer2D>;
}
