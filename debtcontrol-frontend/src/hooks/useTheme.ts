import { useCallback, useEffect } from 'react';
import { useSettingsStore } from '../store';

export function useTheme() {
  const { settings, toggleDarkMode } = useSettingsStore();

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  const toggle = useCallback(() => {
    toggleDarkMode();
  }, [toggleDarkMode]);

  return { isDark: settings.darkMode, toggle };
}