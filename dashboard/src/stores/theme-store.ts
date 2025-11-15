import { create } from 'zustand';
import { Theme } from '../config/theme';

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: 'true-black',
  setTheme: (theme) => {
    set({ theme });
    document.documentElement.className = `theme-${theme}`;
    localStorage.setItem('pow3r-theme', theme);
  },
}));

// Initialize theme from localStorage
if (typeof window !== 'undefined') {
  const savedTheme = localStorage.getItem('pow3r-theme') as Theme | null;
  if (savedTheme && ['true-black', 'light', 'glass'].includes(savedTheme)) {
    useThemeStore.getState().setTheme(savedTheme);
  }
}

