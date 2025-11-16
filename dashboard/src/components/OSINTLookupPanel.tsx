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

  // 2D Rendering (default) - Card-based layout with all lookup types visible
  const render2D = () => (
    <div className="space-y-6">
      {/* Lookup Type Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface border-2 rounded-xl p-6 hover:border-true-black-accent theme-light:hover:border-light-accent theme-glass:hover:border-glass-accent transition-all duration-300 hover:shadow-lg hover:scale-105 animate-fadeIn ${
                isActive
                  ? 'border-true-black-accent theme-light:border-light-accent theme-glass:border-glass-accent shadow-lg scale-105'
                  : 'border-true-black-border theme-light:border-light-border theme-glass:border-glass-border'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex flex-col items-center gap-3">
                <div className={`p-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-true-black-accent theme-light:bg-light-accent theme-glass:bg-glass-accent'
                    : 'bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg'
                }`}>
                  <Icon className={`w-8 h-8 ${
                    isActive
                      ? 'text-white'
                      : 'text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted'
                  }`} />
                </div>
                <span className={`font-header text-sm font-medium ${
                  isActive
                    ? 'text-true-black-text theme-light:text-light-text theme-glass:text-glass-text'
                    : 'text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted'
                }`}>
                  {tab.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Lookup Content */}
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
