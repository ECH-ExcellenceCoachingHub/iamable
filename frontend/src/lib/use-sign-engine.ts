'use client';

import { useEffect, useState } from 'react';

type SignEngine = typeof import('./sign-images');

let loaded: SignEngine | null = null;
let loading: Promise<SignEngine> | null = null;

/**
 * Loads the sign dictionary (~100 KB gzipped) as one shared chunk, on first use,
 * instead of bundling a copy into every page. Returns null until it's ready.
 */
export function useSignEngine(): SignEngine | null {
  const [engine, setEngine] = useState(loaded);

  useEffect(() => {
    if (loaded) return;
    let active = true;
    loading ??= import('./sign-images');
    loading.then((mod) => {
      loaded = mod;
      if (active) setEngine(mod);
    });
    return () => {
      active = false;
    };
  }, []);

  return engine;
}
