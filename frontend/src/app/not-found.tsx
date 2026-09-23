import Link from 'next/link';
import { ArrowLeft, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';

export default function NotFound() {
  return (
    <main id="main-content" className="relative isolate flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <div className="bg-grid mask-fade-b pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <Link href="/" aria-label="Am Able home" className="absolute left-6 top-6 rounded-lg">
        <Logo />
      </Link>
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20">
        <Compass className="size-7" />
      </span>
      <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">404</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Page not found</h1>
      <p className="mt-4 max-w-md text-muted">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button href="/" size="lg">
          <ArrowLeft />
          Back to home
        </Button>
        <Button href="/contact" variant="outline" size="lg">
          Contact support
        </Button>
      </div>
    </main>
  );
}
