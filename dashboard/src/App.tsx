import { useEffect } from 'react';
import { useConfigStore } from './stores/config-store';
import { useThemeStore } from './stores/theme-store';
import UnifiedDashboard from './components/UnifiedDashboard';

function App() {
  const { fetchConfig, loading, theme: configTheme, setTheme: setConfigTheme } = useConfigStore();
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Sync theme store with config store
  useEffect(() => {
    if (configTheme && configTheme !== theme) {
      setTheme(configTheme);
    }
  }, [configTheme, theme, setTheme]);

  useEffect(() => {
    document.documentElement.className = `theme-${theme}`;
    // Also set data-theme for CSS variable support
    document.documentElement.setAttribute('data-theme', theme);
    // Sync config store theme
    if (configTheme !== theme) {
      setConfigTheme(theme);
    }
  }, [theme, configTheme, setConfigTheme]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-true-black-bg text-true-black-text theme-light:bg-light-bg theme-light:text-light-text theme-glass:bg-glass-bg theme-glass:text-glass-text">
        <div className="text-center">
          <h1 className="font-header text-2xl mb-4">Pow3r Defender</h1>
          <p>Loading configuration...</p>
        </div>
      </div>
    );
  }

  return <UnifiedDashboard />;
}

export default App;

