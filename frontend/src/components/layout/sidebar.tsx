'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Bell,
  BrainCircuit,
  ChevronsLeft,
  ChevronsRight,
  FileWarning,
  GraduationCap,
  Hand,
  LayoutDashboard,
  LayoutGrid,
  Mic,
  Server,
  Settings,
  Type,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useUIStore } from '@/store/ui-store';
import { Logo, LogoMark } from '@/components/ui/logo';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const sections: { title: string; items: NavItem[]; adminOnly?: boolean }[] = [
  {
    title: 'Translate',
    items: [
      { href: '/dashboard', label: 'Overview', icon: <LayoutGrid /> },
      { href: '/dashboard/translation', label: 'Sign to Text', icon: <Hand /> },
      { href: '/dashboard/voice', label: 'Voice to Sign', icon: <Mic /> },
      { href: '/dashboard/text-to-sign', label: 'Text to Sign', icon: <Type /> },
    ],
  },
  {
    title: 'Learn',
    items: [{ href: '/dashboard/learn', label: 'Learn Sign Language', icon: <GraduationCap /> }],
  },
  {
    title: 'Account',
    items: [
      { href: '/dashboard/notifications', label: 'Notifications', icon: <Bell /> },
      { href: '/dashboard/settings', label: 'Settings', icon: <Settings /> },
    ],
  },
  {
    title: 'Admin',
    adminOnly: true,
    items: [
      { href: '/admin', label: 'Dashboard', icon: <LayoutDashboard /> },
      { href: '/admin/users', label: 'Users', icon: <Users /> },
      { href: '/admin/reports', label: 'Reports', icon: <FileWarning /> },
      { href: '/admin/ai-training', label: 'AI Training', icon: <BrainCircuit /> },
      { href: '/admin/ai-performance', label: 'AI Performance', icon: <Activity /> },
      { href: '/admin/system', label: 'System Monitor', icon: <Server /> },
    ],
  },
];

function NavLinks({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4 scrollbar-thin" aria-label="App">
      {sections
        .filter((section) => !section.adminOnly || isAdmin)
        .map((section) => (
          <div key={section.title}>
            {collapsed ? (
              <div className="mx-auto mb-2 h-px w-6 bg-border" aria-hidden="true" />
            ) : (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-subtle">{section.title}</p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors [&_svg]:size-[18px] [&_svg]:shrink-0',
                        collapsed && 'justify-center px-0',
                        active
                          ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                          : 'text-muted hover:bg-surface-muted hover:text-foreground'
                      )}
                    >
                      {active && (
                        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-brand-600 dark:bg-brand-400" aria-hidden="true" />
                      )}
                      {item.icon}
                      <span className={cn(collapsed && 'sr-only')}>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
    </nav>
  );
}

export const Sidebar = () => {
  const { sidebarCollapsed, toggleSidebarCollapsed, mobileNavOpen, setMobileNavOpen } = useUIStore();

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-surface transition-[width] duration-200 md:flex',
          sidebarCollapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        <div className={cn('flex h-16 shrink-0 items-center border-b border-border', sidebarCollapsed ? 'justify-center' : 'px-5')}>
          <Link href="/dashboard" aria-label="Am Able dashboard" className="rounded-lg">
            {sidebarCollapsed ? <LogoMark /> : <Logo />}
          </Link>
        </div>
        <NavLinks collapsed={sidebarCollapsed} />
        <div className="border-t border-border p-3">
          <button
            onClick={toggleSidebarCollapsed}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-muted hover:text-foreground',
              sidebarCollapsed && 'justify-center px-0'
            )}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronsRight className="size-[18px]" /> : <ChevronsLeft className="size-[18px]" />}
            {!sidebarCollapsed && 'Collapse'}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn('fixed inset-0 z-50 md:hidden', mobileNavOpen ? 'pointer-events-auto' : 'pointer-events-none')}
        aria-hidden={!mobileNavOpen}
      >
        <div
          className={cn('absolute inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity', mobileNavOpen ? 'opacity-100' : 'opacity-0')}
          onClick={() => setMobileNavOpen(false)}
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-surface shadow-2xl transition-transform duration-200',
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          )}
          {...(!mobileNavOpen && { inert: true })}
        >
          <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
            <Logo />
          </div>
          <NavLinks collapsed={false} onNavigate={() => setMobileNavOpen(false)} />
        </aside>
      </div>
    </>
  );
};
