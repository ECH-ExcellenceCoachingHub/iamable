'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, ChevronDown, Home, LogOut, Menu, Settings, Shield } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useUIStore } from '@/store/ui-store';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { api } from '@/lib/api';
import { cn, getInitials } from '@/lib/utils';

const titles: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/translation': 'Sign to Text & Voice',
  '/dashboard/voice': 'Voice to Sign',
  '/dashboard/text-to-sign': 'Text to Sign',
  '/dashboard/saved': 'Saved Translations',
  '/dashboard/learn': 'Learn Sign Language',
  '/dashboard/notifications': 'Notifications',
  '/dashboard/settings': 'Settings',
  '/admin': 'Admin Dashboard',
  '/admin/users': 'Users',
  '/admin/reports': 'Reports',
  '/admin/ai-training': 'AI Training',
  '/admin/ai-performance': 'AI Performance',
  '/admin/system': 'System Monitor',
};

export const Avatar = ({ name, className }: { name?: string | null; className?: string }) => (
  <span
    className={cn(
      'bg-brand-gradient flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white',
      className
    )}
    aria-hidden="true"
  >
    {getInitials(name)}
  </span>
);

function UserMenu() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const itemClass =
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-muted [&_svg]:size-4 [&_svg]:text-subtle';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-surface-muted"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <Avatar name={user?.name} />
        <span className="hidden max-w-32 truncate text-sm font-medium text-foreground sm:block">{user?.name?.split(' ')[0]}</span>
        <ChevronDown className="hidden size-4 text-subtle sm:block" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-2 w-64 origin-top-right rounded-xl border border-border bg-surface p-1.5 shadow-xl shadow-slate-900/10 dark:shadow-black/40"
          >
            <div className="flex items-center gap-3 px-3 py-2.5">
              <Avatar name={user?.name} className="size-9" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{user?.name}</p>
                <p className="truncate text-xs text-muted">{user?.email}</p>
              </div>
            </div>
            <div className="my-1 h-px bg-border" />
            <Link href="/dashboard/settings" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
              <Settings /> Settings
            </Link>
            {user?.role === 'admin' && (
              <Link href="/admin" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
                <Shield /> Admin panel
              </Link>
            )}
            <Link href="/" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
              <Home /> Back to website
            </Link>
            <div className="my-1 h-px bg-border" />
            <button role="menuitem" onClick={handleLogout} className={cn(itemClass, 'text-red-600 dark:text-red-400 [&_svg]:text-current')}>
              <LogOut /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationBell() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api.notifications
      .getUnreadCount()
      .then((data: { count?: number }) => !cancelled && setCount(data?.count ?? 0))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <Link
      href="/dashboard/notifications"
      className="relative inline-flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
      aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
    >
      <Bell className="size-[18px]" />
      {count > 0 && (
        <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-4 text-white ring-2 ring-surface">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}

export const AppHeader = () => {
  const pathname = usePathname();
  const setMobileNavOpen = useUIStore((s) => s.setMobileNavOpen);
  const title = titles[pathname ?? ''] ?? 'Dashboard';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      <button
        onClick={() => setMobileNavOpen(true)}
        className="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-surface-muted hover:text-foreground md:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>
      <p className="truncate text-sm font-semibold text-foreground">{title}</p>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <NotificationBell />
        <div className="mx-1.5 h-6 w-px bg-border" aria-hidden="true" />
        <UserMenu />
      </div>
    </header>
  );
};
