import { create } from 'zustand';
import { fetchPow3rConfig, type Pow3rConfig } from '../config/pow3r-config';

interface ConfigStore {
  config: Pow3rConfig | null;
  loading: boolean;
  error: string | null;
  fetchConfig: () => Promise<void>;
}

export const useConfigStore = create<ConfigStore>((set) => ({
  config: null,
  loading: false,
  error: null,
  fetchConfig: async () => {
    set({ loading: true, error: null });
    try {
      const config = await fetchPow3rConfig();
      set({ config, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch config',
        loading: false 
      });
    }
  },
}));

