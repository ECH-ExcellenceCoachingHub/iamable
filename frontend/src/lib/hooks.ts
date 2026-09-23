'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { getErrorMessage } from '@/lib/utils';

interface ApiResult<T> {
  fetcher: (() => Promise<T>) | null;
  nonce: number;
  data?: T;
  error?: string;
}

/**
 * Runs `fetcher` whenever it changes (wrap it in useCallback) or `reload()` is called.
 * `loading` is derived, responses from superseded requests are ignored, and the last
 * successful data is kept while a new request is in flight.
 */
export function useApi<T>(fetcher: () => Promise<T>, fallbackError = 'Something went wrong. Please try again.') {
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<ApiResult<T>>({ fetcher: null, nonce: -1 });

  useEffect(() => {
    let cancelled = false;
    fetcher().then(
      (data) => {
        if (!cancelled) setResult({ fetcher, nonce, data });
      },
      (err) => {
        if (!cancelled) setResult((prev) => ({ fetcher, nonce, data: prev.data, error: getErrorMessage(err, fallbackError) }));
      }
    );
    return () => {
      cancelled = true;
    };
  }, [fetcher, nonce, fallbackError]);

  const loading = result.fetcher !== fetcher || result.nonce !== nonce;
  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const mutate = useCallback((update: (data: T | undefined) => T | undefined) => setResult((r) => ({ ...r, data: update(r.data) })), []);

  return { data: result.data, error: loading ? undefined : result.error, loading, reload, mutate };
}

const noopSubscribe = () => () => {};

/**
 * False during SSR and the hydration render, true afterwards. Persisted zustand stores
 * read localStorage synchronously, so once this is true their state is ready.
 */
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
