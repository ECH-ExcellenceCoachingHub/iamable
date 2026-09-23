'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useUIStore } from '@/store/ui-store';
import { useHydrated } from '@/lib/hooks';
import { Sidebar } from '@/components/layout/sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
  requireRole?: 'admin';
}

/** Authenticated layout: guards the route, then renders sidebar + header + content. */
export const AppShell = ({ children, requireRole }: AppShellProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const { isAuthenticated, user } = useAuthStore();
  const { sidebarCollapsed, setMobileNavOpen } = useUIStore();

  const allowed = isAuthenticated && (!requireRole || user?.role === requireRole);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname ?? '/dashboard')}`);
    } else if (requireRole && user?.role !== requireRole) {
      router.replace('/dashboard');
    }
  }, [hydrated, isAuthenticated, user, requireRole, router, pathname]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname, setMobileNavOpen]);

  if (!hydrated || !allowed) {
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading">
        <Loader2 className="size-6 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <Sidebar />
      <div className={cn('flex min-h-dvh flex-col transition-[padding] duration-200', sidebarCollapsed ? 'md:pl-[72px]' : 'md:pl-64')}>
        <AppHeader />
        <main id="main-content" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
};

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader = ({ title, description, actions }: PageHeaderProps) => (
  <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
      {description && <p className="mt-1.5 text-muted">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </div>
);
