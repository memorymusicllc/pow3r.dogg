import { useState } from 'react';
import { useThemeStore } from '../stores/theme-store';
import DashboardOverview from './DashboardOverview';
import OSINTLookupPanel from './OSINTLookupPanel';
import AttackerDatabase from './AttackerDatabase';
import EvidenceTimeline from './EvidenceTimeline';
import KnowledgeGraphView from './KnowledgeGraphView';
import AuthBanner from './AuthBanner';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CubeIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';

type View = 'dashboard' | 'osint' | 'attackers' | 'evidence' | 'knowledge-graph';

export default function UnifiedDashboard() {
  const { theme, setTheme } = useThemeStore();
  const [activeView, setActiveView] = useState<View>('dashboard');
  const [selectedAttackerId, setSelectedAttackerId] = useState<string | null>(null);

  const views: Array<{ id: View; label: string; icon: typeof HomeIcon }> = [
    { id: 'dashboard', label: 'Dashboard', icon: HomeIcon },
    { id: 'osint', label: 'OSINT Lookup', icon: MagnifyingGlassIcon },
    { id: 'attackers', label: 'Attackers', icon: UserGroupIcon },
    { id: 'evidence', label: 'Evidence', icon: DocumentTextIcon },
    { id: 'knowledge-graph', label: 'Knowledge Graph', icon: CubeIcon },
  ];

  const themes = [
    { id: 'true-black' as const, label: 'True Black', icon: MoonIcon },
    { id: 'light' as const, label: 'Light', icon: SunIcon },
    { id: 'glass' as const, label: 'Glass', icon: ComputerDesktopIcon },
  ];

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardOverview />;
      case 'osint':
        return <OSINTLookupPanel />;
      case 'attackers':
        return <AttackerDatabase onAttackerSelect={setSelectedAttackerId} />;
      case 'evidence':
        return <EvidenceTimeline />;
      case 'knowledge-graph':
        return <KnowledgeGraphView attackerId={selectedAttackerId} />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-true-black-bg text-true-black-text theme-light:bg-light-bg theme-light:text-light-text theme-glass:bg-glass-bg theme-glass:text-glass-text theme-glass:backdrop-blur-md">
      {/* Header */}
      <header className="border-b border-true-black-border bg-true-black-surface theme-light:border-light-border theme-light:bg-light-surface theme-glass:border-glass-border theme-glass:bg-glass-surface sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="font-header text-2xl">Pow3r Defender</h1>
            <div className="flex items-center gap-4">
              {/* Theme Switcher */}
              <div className="flex items-center gap-2 bg-true-black-bg theme-light:bg-light-bg theme-glass:bg-glass-bg border border-true-black-border theme-light:border-light-border theme-glass:border-glass-border rounded-lg p-1">
                {themes.map((t) => {
                  const Icon = t.icon;
                  const isActive = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                        isActive
                          ? 'bg-true-black-accent theme-light:bg-light-accent theme-glass:bg-glass-accent text-white'
                          : 'text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted hover:text-true-black-text theme-light:hover:text-light-text theme-glass:hover:text-glass-text'
                      }`}
                      title={t.label}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation - Desktop */}
        <nav className="hidden md:flex w-64 border-r border-true-black-border theme-light:border-light-border theme-glass:border-glass-border bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface p-4 flex-col">
          <ul className="space-y-2 flex-1">
            {views.map((view) => {
              const Icon = view.icon;
              const isActive = activeView === view.id;
              return (
                <li key={view.id}>
                  <button
                    onClick={() => {
                      setActiveView(view.id);
                      if (view.id === 'knowledge-graph' && !selectedAttackerId) {
                        // If no attacker selected, go to attackers first
                        setActiveView('attackers');
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-true-black-accent theme-light:bg-light-accent theme-glass:bg-glass-accent text-white'
                        : 'hover:bg-true-black-surface theme-light:hover:bg-light-surface theme-glass:hover:bg-glass-surface text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted hover:text-true-black-text theme-light:hover:text-light-text theme-glass:hover:text-glass-text'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{view.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Navigation - Mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-true-black-border theme-light:border-light-border theme-glass:border-glass-border bg-true-black-surface theme-light:bg-light-surface theme-glass:bg-glass-surface z-50">
          <div className="flex justify-around items-center h-16 px-2">
            {views.map((view) => {
              const Icon = view.icon;
              const isActive = activeView === view.id;
              return (
                <button
                  key={view.id}
                  onClick={() => {
                    setActiveView(view.id);
                    if (view.id === 'knowledge-graph' && !selectedAttackerId) {
                      setActiveView('attackers');
                    }
                  }}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'text-true-black-accent theme-light:text-light-accent theme-glass:text-glass-accent'
                      : 'text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{view.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto pb-20 md:pb-6">
          <AuthBanner />
          {renderView()}
        </main>
      </div>
    </div>
  );
}

