import { create } from 'zustand';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeStore {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(mode: ThemeMode): 'light' | 'dark' {
  const resolved = mode === 'system' ? getSystemTheme() : mode;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  return resolved;
}

const savedMode = (typeof localStorage !== 'undefined' ? localStorage.getItem('apo_theme_mode') : null) as ThemeMode | null;
const initialMode: ThemeMode = savedMode || 'system';
const initialResolved = applyTheme(initialMode);

export const useThemeStore = create<ThemeStore>((set, get) => {
  if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (get().mode === 'system') {
        set({ resolved: applyTheme('system') });
      }
    });
  }

  return {
    mode: initialMode,
    resolved: initialResolved,
    setMode: (mode: ThemeMode) => {
      localStorage.setItem('apo_theme_mode', mode);
      set({ mode, resolved: applyTheme(mode) });
    },
  };
});
