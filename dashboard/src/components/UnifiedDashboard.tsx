import { useState } from 'react';
import { useThemeStore } from '../stores/theme-store';
import { useConfigStore } from '../stores/config-store';
import DashboardOverview from './DashboardOverview';
import OSINTLookupPanel from './OSINTLookupPanel';
import AttackerDatabase from './AttackerDatabase';
import EvidenceTimeline from './EvidenceTimeline';
import KnowledgeGraphView from './KnowledgeGraphView';
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';

export default function UnifiedDashboard() {
  const { theme, setTheme } = useThemeStore();
  const { setTheme: setConfigTheme } = useConfigStore();
  const [selectedAttackerId, setSelectedAttackerId] = useState<string | null>(null);

  const themes = [
    { id: 'true-black' as const, label: 'True Black', icon: MoonIcon },
    { id: 'light' as const, label: 'Light', icon: SunIcon },
    { id: 'glass' as const, label: 'Glass', icon: ComputerDesktopIcon },
  ];

  const cycleTheme = () => {
    const currentIndex = themes.findIndex(t => t.id === theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    setTheme(nextTheme.id);
    setConfigTheme(nextTheme.id);
  };

  const currentTheme = themes.find(t => t.id === theme);
  const ThemeIcon = currentTheme?.icon || MoonIcon;

  return (
    <div className="min-h-screen bg-true-black-bg text-true-black-text theme-light:bg-light-bg theme-light:text-light-text theme-glass:bg-glass-bg theme-glass:text-glass-text theme-glass:backdrop-blur-md">
      {/* Toggle Icon Button - Fixed Position */}
      <button
        onClick={cycleTheme}
        className="fixed top-4 right-4 z-50 p-2 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted hover:text-true-black-text theme-light:hover:text-light-text theme-glass:hover:text-glass-text transition-colors"
        title={currentTheme?.label || 'Toggle Theme'}
        aria-label="Toggle theme"
      >
        <ThemeIcon className="w-5 h-5" />
      </button>

      {/* Dashboard Cards Grid */}
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <DashboardOverview />
          <OSINTLookupPanel />
          <AttackerDatabase onAttackerSelect={setSelectedAttackerId} />
          <EvidenceTimeline />
          <KnowledgeGraphView attackerId={selectedAttackerId} />
        </div>
      </div>
    </div>
  );
}
