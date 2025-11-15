import { create } from 'zustand';
import { pow3rPassService } from '../services/pow3r-pass';

interface AuthState {
  isAuthenticated: boolean;
  authError: string | null;
  pow3rPassUrl: string;
  checkAuth: () => Promise<void>;
  setAuthenticated: (value: boolean) => void;
  setAuthError: (error: string | null) => void;
  authenticate: () => Promise<boolean>;
}

const POW3R_PASS_URL = 'https://config.superbots.link/pass';

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  authError: null,
  pow3rPassUrl: POW3R_PASS_URL,
  
  checkAuth: async () => {
    try {
      const token = await pow3rPassService.getAuthToken();
      if (token && token.length >= 32) {
        // Validate token
        const isValid = await pow3rPassService.validateToken(token);
        if (isValid) {
          set({ isAuthenticated: true, authError: null });
        } else {
          set({ 
            isAuthenticated: false, 
            authError: 'Invalid or expired token. Please authenticate via Pow3r Pass.' 
          });
        }
      } else {
        set({ 
          isAuthenticated: false, 
          authError: 'Authentication required. Please authenticate via Pow3r Pass.' 
        });
      }
    } catch (error) {
      set({ 
        isAuthenticated: false, 
        authError: 'Failed to check authentication. Please authenticate via Pow3r Pass.' 
      });
    }
  },
  
  authenticate: async () => {
    try {
      const token = await pow3rPassService.getAuthToken();
      if (token) {
        const isValid = await pow3rPassService.validateToken(token);
        if (isValid) {
          set({ isAuthenticated: true, authError: null });
          return true;
        }
      }
      set({ 
        isAuthenticated: false, 
        authError: 'Authentication required. Please authenticate via Pow3r Pass.' 
      });
      return false;
    } catch (error) {
      set({ 
        isAuthenticated: false, 
        authError: 'Authentication failed. Please authenticate via Pow3r Pass.' 
      });
      return false;
    }
  },
  
  setAuthenticated: (value: boolean) => {
    set({ isAuthenticated: value, authError: value ? null : 'Authentication required. Please authenticate via Pow3r Pass.' });
  },
  
  setAuthError: (error: string | null) => {
    set({ authError: error, isAuthenticated: !error });
  },
}));

