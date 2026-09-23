'use client';

import React, { useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { useUIStore } from '@/store/ui-store';
import { useAccessibilityStore } from '@/store/accessibility-store';
import { Toaster } from '@/components/ui/toaster';
import { PwaSupport } from '@/components/pwa';

/**
 * Runs before first paint to apply the saved theme and accessibility classes,
 * so users never see a flash of the wrong theme or text size.
 */
const preloadScript = `(function(){try{
var d=document.documentElement;
var ui=JSON.parse(localStorage.getItem('ui-storage')||'{}').state||{};
var t=ui.theme||'system';
var dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
d.classList.toggle('dark',dark);
var p=(JSON.parse(localStorage.getItem('accessibility-storage')||'{}').state||{}).preferences||{};
d.classList.toggle('a11y-large-text',!!p.largeText);
d.classList.toggle('a11y-high-contrast',!!p.highContrast);
d.classList.toggle('a11y-reduced-motion',!!p.reducedMotion);
d.classList.toggle('a11y-focus',!!p.keyboardNavigation);
}catch(e){}})();`;

export const PreloadScript = () => <script dangerouslySetInnerHTML={{ __html: preloadScript }} />;

function ThemeSync() {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    if (theme !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  return null;
}

function AccessibilitySync() {
  const preferences = useAccessibilityStore((s) => s.preferences);

  useEffect(() => {
    const root = document.documentElement.classList;
    root.toggle('a11y-large-text', preferences.largeText);
    root.toggle('a11y-high-contrast', preferences.highContrast);
    root.toggle('a11y-reduced-motion', preferences.reducedMotion);
    root.toggle('a11y-focus', preferences.keyboardNavigation);
  }, [preferences]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const reducedMotion = useAccessibilityStore((s) => s.preferences.reducedMotion);

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'user'}>
      <ThemeSync />
      <AccessibilitySync />
      {children}
      <Toaster />
      <PwaSupport />
    </MotionConfig>
  );
}
