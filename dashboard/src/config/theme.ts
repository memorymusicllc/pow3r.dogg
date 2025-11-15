export type Theme = 'true-black' | 'light' | 'glass';

export interface ThemeConfig {
  name: Theme;
  colors: {
    bg: string;
    surface: string;
    border: string;
    text: string;
    textMuted: string;
    accent: string;
    accentHover: string;
  };
}

export const themes: Record<Theme, ThemeConfig> = {
  'true-black': {
    name: 'true-black',
    colors: {
      bg: '#000000',
      surface: '#0a0a0a',
      border: '#1a1a1a',
      text: '#ffffff',
      textMuted: '#a0a0a0',
      accent: '#3b82f6',
      accentHover: '#2563eb',
    },
  },
  light: {
    name: 'light',
    colors: {
      bg: '#ffffff',
      surface: '#f5f5f5',
      border: '#e5e5e5',
      text: '#000000',
      textMuted: '#666666',
      accent: '#3b82f6',
      accentHover: '#2563eb',
    },
  },
  glass: {
    name: 'glass',
    colors: {
      bg: 'rgba(0, 0, 0, 0.3)',
      surface: 'rgba(255, 255, 255, 0.1)',
      border: 'rgba(255, 255, 255, 0.2)',
      text: '#ffffff',
      textMuted: 'rgba(255, 255, 255, 0.7)',
      accent: '#3b82f6',
      accentHover: '#2563eb',
    },
  },
};

