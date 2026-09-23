'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main-content" className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-200 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/25">
        <AlertTriangle className="size-7" />
      </span>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">Something went wrong</h1>
      <p className="mt-3 max-w-md text-muted">An unexpected error occurred. Please try again — if it keeps happening, contact support.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset} size="lg">
          <RefreshCw />
          Try again
        </Button>
        <Button href="/" variant="outline" size="lg">
          Back to home
        </Button>
      </div>
    </main>
  );
}
