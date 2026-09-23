'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useHydrated } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
];

export const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useHydrated();
  const { isAuthenticated, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const authed = hydrated && isAuthenticated;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu whenever the route changes
  const [prevPath, setPrevPath] = useState(pathname);
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpen(false);
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow] duration-200',
        scrolled || open
          ? 'border-b border-border bg-background/80 shadow-sm shadow-slate-900/[0.03] backdrop-blur-xl'
          : 'border-b border-transparent'
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Main">
        <Link href="/" aria-label="Am Able home" className="rounded-lg">
          <Logo />
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active ? 'text-foreground' : 'text-muted hover:text-foreground'
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {authed ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Sign out
              </Button>
              <Button href="/dashboard" size="sm">
                <LayoutDashboard />
                Dashboard
              </Button>
            </>
          ) : (
            <>
              <Button href="/login" variant="ghost" size="sm">
                Sign in
              </Button>
              <Button href="/register" size="sm">
                Get started
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            className="inline-flex size-10 items-center justify-center rounded-lg text-foreground hover:bg-surface-muted"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-border md:hidden"
          >
            <div className="space-y-1 px-4 py-4">
              <Link href="/" className="block rounded-lg px-3 py-2.5 text-base font-medium text-foreground hover:bg-surface-muted">
                Home
              </Link>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={pathname === link.href ? 'page' : undefined}
                  className="block rounded-lg px-3 py-2.5 text-base font-medium text-foreground hover:bg-surface-muted aria-[current=page]:bg-surface-muted"
                >
                  {link.label}
                </Link>
              ))}
              <div className="grid grid-cols-2 gap-2 pt-3">
                {authed ? (
                  <>
                    <Button variant="outline" onClick={handleLogout}>
                      <LogOut />
                      Sign out
                    </Button>
                    <Button href="/dashboard">Dashboard</Button>
                  </>
                ) : (
                  <>
                    <Button href="/login" variant="outline">
                      Sign in
                    </Button>
                    <Button href="/register">Get started</Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
