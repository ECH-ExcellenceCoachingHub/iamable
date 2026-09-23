'use client';

import React, { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa-install-dismissed';

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

/** Registers the service worker and offers to install the app when the browser allows it. */
export function PwaSupport() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    // A service worker in dev mode would cache stale bundles and break hot reload.
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* The app still works without it; it just isn't installable. */
      });
    }

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone;
    if (standalone || wasDismissed()) return;

    // iOS Safari has no install prompt, so explain the manual steps instead.
    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) iosTimer = setTimeout(() => setShowIosHint(true), 0);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      clearTimeout(iosTimer);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    setInstallEvent(null);
    setShowIosHint(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* Storage unavailable; the banner simply comes back next visit. */
    }
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') setInstallEvent(null);
    else dismiss();
  };

  if (!installEvent && !showIosHint) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Am Able"
      className="fixed inset-x-4 bottom-4 z-[250] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-xl sm:left-auto sm:right-4 sm:mx-0"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" className="size-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Install Am Able</p>
        <p className="text-xs text-muted">
          {installEvent ? (
            'Add it to your home screen for quick, full-screen access.'
          ) : (
            <>
              Tap <Share className="inline size-3.5 align-[-2px]" aria-label="Share" /> then &ldquo;Add to Home Screen&rdquo;.
            </>
          )}
        </p>
      </div>
      {installEvent && (
        <Button size="sm" onClick={install}>
          <Download />
          Install
        </Button>
      )}
      <Button variant="ghost" size="icon-sm" onClick={dismiss} aria-label="Dismiss">
        <X />
      </Button>
    </div>
  );
}
