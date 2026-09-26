'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Bell, CheckCheck, CheckCircle2, Info, Trash2, X, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/modal';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { api } from '@/lib/api';
import { toast } from '@/store/toast-store';
import { cn, formatRelativeTime, getErrorMessage } from '@/lib/utils';
import { useApi } from '@/lib/hooks';
import { notifyNotificationsChanged } from '@/lib/push';
import { PushSettings } from '@/components/notifications/push-settings';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  link?: string;
}

const typeStyles: Record<Notification['type'], { icon: React.ReactNode; className: string }> = {
  info: { icon: <Info />, className: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300' },
  success: { icon: <CheckCircle2 />, className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300' },
  warning: { icon: <AlertTriangle />, className: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300' },
  error: { icon: <XCircle />, className: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300' },
};

type Filter = 'all' | 'unread';

async function fetchNotifications(): Promise<Notification[]> {
  const data = await api.notifications.getAll();
  return Array.isArray(data) ? data : [];
}

export default function NotificationsPage() {
  const { data, loading, error, reload: load, mutate } = useApi(fetchNotifications, 'Could not load notifications.');
  const notifications = data ?? [];
  const setNotifications = (update: (prev: Notification[]) => Notification[]) => mutate((prev) => update(prev ?? []));
  const [filter, setFilter] = useState<Filter>('all');
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  // A push arriving while this page is open shows up in the list straight away.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== 'notification:received') return;
      fetchNotifications()
        .then((list) => mutate(() => list))
        .catch(() => {});
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [mutate]);

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    try {
      await api.notifications.markAsRead(id);
      notifyNotificationsChanged();
    } catch (err) {
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: false } : n)));
      toast.error('Could not update notification', getErrorMessage(err));
    }
  };

  const markAllAsRead = async () => {
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.notifications.markAllAsRead();
      notifyNotificationsChanged();
      toast.success('All notifications marked as read');
    } catch (err) {
      setNotifications(() => previous);
      toast.error('Could not update notifications', getErrorMessage(err));
    }
  };

  const remove = async (id: string) => {
    const previous = notifications;
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    try {
      await api.notifications.delete(id);
      notifyNotificationsChanged();
    } catch (err) {
      setNotifications(() => previous);
      toast.error('Could not dismiss notification', getErrorMessage(err));
    }
  };

  const clearAll = async () => {
    setClearing(true);
    try {
      await api.notifications.clearAll();
      setNotifications(() => []);
      notifyNotificationsChanged();
      setConfirmClear(false);
      toast.success('Notifications cleared');
    } catch (err) {
      toast.error('Could not clear notifications', getErrorMessage(err));
    } finally {
      setClearing(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const visible = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  return (
    <>
      <PageHeader
        title="Notifications"
        description={loading ? 'Loading…' : unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.` : "You're all caught up."}
        actions={
          notifications.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
                <CheckCheck />
                Mark all read
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
                <Trash2 />
                Clear all
              </Button>
            </>
          )
        }
      />

      <PushSettings />

      <div className="mb-4 inline-flex rounded-xl bg-surface-muted p-1 ring-1 ring-inset ring-border" role="tablist" aria-label="Filter notifications">
        {(['all', 'unread'] as Filter[]).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-all',
              filter === f ? 'bg-surface text-foreground shadow-sm ring-1 ring-border' : 'text-muted hover:text-foreground'
            )}
          >
            {f}
            {f === 'unread' && unreadCount > 0 && (
              <span className="rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <Card className="overflow-hidden">
          {loading ? (
            <div className="divide-y divide-border">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 p-5">
                  <Skeleton className="size-10 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={<Bell />}
              title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              description="We'll let you know when something needs your attention."
            />
          ) : (
            <ul className="divide-y divide-border">
              <AnimatePresence initial={false}>
                {visible.map((n) => {
                  const style = typeStyles[n.type] ?? typeStyles.info;
                  return (
                    <motion.li
                      key={n._id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, height: 0 }}
                      className={cn('group relative flex gap-4 p-5 transition-colors', !n.read && 'bg-brand-50/40 dark:bg-brand-500/[0.04]')}
                    >
                      {!n.read && <span className="absolute left-0 top-0 h-full w-0.5 bg-brand-600 dark:bg-brand-400" aria-hidden="true" />}
                      <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5', style.className)}>
                        {style.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <p className={cn('text-sm', n.read ? 'font-medium text-muted' : 'font-semibold text-foreground')}>
                            {n.title}
                            {!n.read && <span className="sr-only"> (unread)</span>}
                          </p>
                          <time dateTime={n.createdAt} className="text-xs text-subtle">
                            {formatRelativeTime(n.createdAt)}
                          </time>
                        </div>
                        <p className="mt-1 text-sm text-muted">{n.message}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {n.link && (
                            <Link href={n.link} onClick={() => !n.read && markAsRead(n._id)} className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
                              View details
                            </Link>
                          )}
                          {!n.read && (
                            <button onClick={() => markAsRead(n._id)} className="text-sm font-medium text-muted hover:text-foreground">
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove(n._id)}
                        aria-label={`Dismiss "${n.title}"`}
                        className="shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                      >
                        <X />
                      </Button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          )}
        </Card>
      )}

      <ConfirmDialog
        isOpen={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={clearAll}
        isLoading={clearing}
        destructive
        title="Clear all notifications?"
        description="This permanently removes all of your notifications. This can't be undone."
        confirmLabel="Clear all"
      />
    </>
  );
}
