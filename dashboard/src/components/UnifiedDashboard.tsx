import { useState, useEffect } from 'react';
import { useThemeStore } from '../stores/theme-store';
import { useConfigStore } from '../stores/config-store';
import DashboardOverview from './DashboardOverview';
import OSINTLookupPanel from './OSINTLookupPanel';
import AttackerDatabase from './AttackerDatabase';
import EvidenceTimeline from './EvidenceTimeline';
import KnowledgeGraphView from './KnowledgeGraphView';
import TeamMemberMI from './TeamMemberMI';
import LinkTracker from './LinkTracker';
import FileTracker from './FileTracker';
import CommunicationRecorder from './CommunicationRecorder';
import ReplySuggestions from './ReplySuggestions';
import MediaGenerator from './MediaGenerator';
import RenderingModeSwitcher from './RenderingModeSwitcher';
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';

export default function UnifiedDashboard() {
  const { theme, setTheme } = useThemeStore();
  const { setTheme: setConfigTheme } = useConfigStore();
  const [selectedAttackerId, setSelectedAttackerId] = useState<string | null>(null);

  useEffect(() => {
    // Initialize config on mount
    const { fetchConfig } = useConfigStore.getState();
    fetchConfig();
  }, []);

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
      {/* Control Buttons - Fixed Position */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <RenderingModeSwitcher />
        <button
          onClick={cycleTheme}
          className="p-2 text-true-black-text-muted theme-light:text-light-text-muted theme-glass:text-glass-text-muted hover:text-true-black-text theme-light:hover:text-light-text theme-glass:hover:text-glass-text transition-colors"
          title={currentTheme?.label || 'Toggle Theme'}
          aria-label="Toggle theme"
        >
          <ThemeIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Dashboard Cards Grid - Mobile-first responsive with smooth scrolling */}
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 md:space-y-6 scroll-smooth">
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 max-w-7xl mx-auto">
          <section id="overview" className="scroll-mt-20">
            <DashboardOverview />
          </section>
          <section id="osint" className="scroll-mt-20">
            <OSINTLookupPanel />
          </section>
          <section id="attackers" className="scroll-mt-20">
            <AttackerDatabase onAttackerSelect={setSelectedAttackerId} />
          </section>
          <section id="evidence" className="scroll-mt-20">
            <EvidenceTimeline />
          </section>
          <section id="knowledge-graph" className="scroll-mt-20">
            <KnowledgeGraphView attackerId={selectedAttackerId} />
          </section>
          <section id="team-members" className="scroll-mt-20">
            <TeamMemberMI />
          </section>
          <section id="link-tracker" className="scroll-mt-20">
            <LinkTracker />
          </section>
          <section id="file-tracker" className="scroll-mt-20">
            <FileTracker />
          </section>
          <section id="communication-recorder" className="scroll-mt-20">
            <CommunicationRecorder />
          </section>
          <section id="reply-suggestions" className="scroll-mt-20">
            <ReplySuggestions />
          </section>
          <section id="media-generator" className="scroll-mt-20">
            <MediaGenerator />
          </section>
        </div>
      </div>
    </div>
  );
}
