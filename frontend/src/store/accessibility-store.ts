import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AccessibilityPreferences {
  largeText: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  keyboardNavigation: boolean;
}

interface AccessibilityState {
  preferences: AccessibilityPreferences;
  setPreferences: (preferences: Partial<AccessibilityPreferences>) => void;
  togglePreference: (key: keyof AccessibilityPreferences) => void;
  resetPreferences: () => void;
}

export const defaultPreferences: AccessibilityPreferences = {
  largeText: false,
  highContrast: false,
  reducedMotion: false,
  keyboardNavigation: false,
};

export const useAccessibilityStore = create<AccessibilityState>()(
  persist(
    (set) => ({
      preferences: defaultPreferences,
      setPreferences: (newPreferences) =>
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences },
        })),
      togglePreference: (key) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            [key]: !state.preferences[key],
          },
        })),
      resetPreferences: () => set({ preferences: defaultPreferences }),
    }),
    {
      name: 'accessibility-storage',
      merge: (persisted, current) => ({
        ...current,
        preferences: {
          ...defaultPreferences,
          ...((persisted as Partial<AccessibilityState>)?.preferences ?? {}),
        },
      }),
    }
  )
);
