import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useConfigStore } from './stores/config-store';
import { useThemeStore } from './stores/theme-store';
import Layout from './components/Layout';
import DashboardOverview from './components/DashboardOverview';
import OSINTLookupPanel from './components/OSINTLookupPanel';
import AttackerDatabase from './components/AttackerDatabase';
import EvidenceTimeline from './components/EvidenceTimeline';
import KnowledgeGraphView from './components/KnowledgeGraphView';

function App() {
  const { fetchConfig, loading } = useConfigStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    document.documentElement.className = `theme-${theme}`;
  }, [theme]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-true-black-bg text-true-black-text">
        <div className="text-center">
          <h1 className="font-header text-2xl mb-4">Pow3r Defender</h1>
          <p>Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardOverview />} />
          <Route path="/osint" element={<OSINTLookupPanel />} />
          <Route path="/attackers" element={<AttackerDatabase />} />
          <Route path="/evidence" element={<EvidenceTimeline />} />
          <Route path="/knowledge-graph/:attackerId?" element={<KnowledgeGraphView />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;

