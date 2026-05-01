import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD || 'debtcontrol123';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,

      login: (password: string) => {
        if (password === APP_PASSWORD) {
          set({ isAuthenticated: true });
          return true;
        }
        return false;
      },

      logout: () => {
        set({ isAuthenticated: false });
      },
    }),
    {
      name: 'debtcontrol-auth',
      partialize: (state) => ({ isAuthenticated: state.isAuthenticated }),
    }
  )
);