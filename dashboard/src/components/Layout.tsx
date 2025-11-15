import { ReactNode, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useThemeStore } from '../stores/theme-store';
import { useAuthStore } from '../stores/auth-store';
import AuthBanner from './AuthBanner';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { theme, setTheme } = useThemeStore();
  const { checkAuth, setAuthError } = useAuthStore();

  useEffect(() => {
    checkAuth();
    
    // Listen for auth-required events from API client
    const handleAuthRequired = (event: CustomEvent) => {
      setAuthError(event.detail.message);
    };
    
    window.addEventListener('auth-required', handleAuthRequired as EventListener);
    
    return () => {
      window.removeEventListener('auth-required', handleAuthRequired as EventListener);
    };
  }, [checkAuth, setAuthError]);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: HomeIcon },
    { path: '/osint', label: 'OSINT Lookup', icon: MagnifyingGlassIcon },
    { path: '/attackers', label: 'Attackers', icon: UserGroupIcon },
    { path: '/evidence', label: 'Evidence', icon: DocumentTextIcon },
    { path: '/knowledge-graph', label: 'Knowledge Graph', icon: CubeIcon },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-true-black-bg text-true-black-text">
      {/* Header */}
      <header className="border-b border-true-black-border bg-true-black-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="font-header text-2xl">Pow3r Defender</h1>
            <div className="flex items-center gap-4">
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'true-black' | 'light' | 'glass')}
                className="bg-true-black-surface border border-true-black-border rounded px-3 py-1 text-sm"
              >
                <option value="true-black">True Black</option>
                <option value="light">Light</option>
                <option value="glass">Glass</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar Navigation */}
        <nav className="w-64 border-r border-true-black-border bg-true-black-surface p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || 
                (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-true-black-accent text-white'
                        : 'hover:bg-true-black-surface text-true-black-text-muted hover:text-true-black-text'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          <AuthBanner />
          {children}
        </main>
      </div>
    </div>
  );
}

