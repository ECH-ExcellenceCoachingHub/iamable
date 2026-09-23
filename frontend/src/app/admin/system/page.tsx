'use client';

import React, { useEffect } from 'react';
import { Activity, AlertTriangle, Clock, Cpu, HardDrive, MemoryStick, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState, Skeleton } from '@/components/ui/feedback';
import { api } from '@/lib/api';
import { cn, formatNumber } from '@/lib/utils';
import { useApi } from '@/lib/hooks';

interface DashboardStats {
  users: { total: number; active: number; admins: number };
  system: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    activeUsers: number;
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    uptime: number;
  };
}

const REFRESH_MS = 30000;

function health(value: number, warn: number, critical: number): { label: string; tone: BadgeTone; bar: string; ring: string } {
  if (value >= critical) return { label: 'Critical', tone: 'danger', bar: 'stroke-red-500', ring: 'text-red-500' };
  if (value >= warn) return { label: 'Warning', tone: 'warning', bar: 'stroke-amber-500', ring: 'text-amber-500' };
  return { label: 'Healthy', tone: 'success', bar: 'stroke-emerald-500', ring: 'text-emerald-500' };
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m`;
}

function Gauge({ label, value, icon, warn, critical, loading }: { label: string; value: number; icon: React.ReactNode; warn: number; critical: number; loading: boolean }) {
  const h = health(value, warn, critical);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value));

  return (
    <Card>
      <CardContent className="flex flex-col items-center text-center">
        <div className="relative size-32">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
            <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="8" className="stroke-surface-muted" />
            {!loading && (
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                className={cn('transition-[stroke-dashoffset] duration-700', h.bar)}
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - pct / 100)}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-subtle [&_svg]:size-4">{icon}</span>
            {loading ? (
              <Skeleton className="mt-1 h-6 w-12" />
            ) : (
              <span className="font-display text-2xl font-bold tabular-nums text-foreground">{value.toFixed(0)}%</span>
            )}
          </div>
        </div>
        <p className="mt-3 font-medium text-foreground">{label}</p>
        {!loading && (
          <Badge tone={h.tone} dot className="mt-2">
            {h.label}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

async function fetchSystemStats() {
  const stats = (await api.admin.getDashboardStats()) as DashboardStats;
  return { stats, fetchedAt: new Date() };
}

export default function SystemMonitorPage() {
  const { data, loading: fetching, error, reload: load } = useApi(fetchSystemStats, 'Could not load system metrics.');
  const stats = data?.stats;
  const updatedAt = data?.fetchedAt;
  // Only show skeletons on the first load; later refreshes keep the current numbers on screen
  const loading = fetching && !data;
  const refreshing = fetching && !!data;

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const s = stats?.system;

  return (
    <>
      <PageHeader
        title="System monitor"
        description={
          <span className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Auto-refreshes every 30 seconds{updatedAt && ` · Updated ${updatedAt.toLocaleTimeString()}`}
          </span>
        }
        actions={
          <Button variant="outline" onClick={load} disabled={refreshing || loading}>
            <RefreshCw className={cn(refreshing && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      {error && !stats ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Gauge label="CPU usage" value={s?.cpuUsage ?? 0} icon={<Cpu />} warn={70} critical={90} loading={loading} />
            <Gauge label="Memory usage" value={s?.memoryUsage ?? 0} icon={<MemoryStick />} warn={70} critical={90} loading={loading} />
            <Gauge label="Disk usage" value={s?.diskUsage ?? 0} icon={<HardDrive />} warn={80} critical={95} loading={loading} />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Uptime" value={formatUptime(s?.uptime ?? 0)} icon={<Clock />} tone="emerald" loading={loading} />
            <StatCard label="Total requests" value={formatNumber(s?.totalRequests ?? 0)} icon={<Activity />} loading={loading} />
            <StatCard label="Avg. response" value={`${(s?.averageResponseTime ?? 0).toFixed(0)} ms`} icon={<Clock />} tone="violet" loading={loading} />
            <StatCard
              label="Error rate"
              value={`${((s?.errorRate ?? 0) * 100).toFixed(2)}%`}
              icon={<AlertTriangle />}
              tone={(s?.errorRate ?? 0) > 0.05 ? 'rose' : 'sky'}
              loading={loading}
            />
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>
                <Users className="size-4 text-subtle" />
                Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-4">
                {[
                  { label: 'Total users', value: stats?.users.total ?? 0, icon: <Users /> },
                  { label: 'Verified users', value: stats?.users.active ?? 0, icon: <ShieldCheck /> },
                  { label: 'Administrators', value: stats?.users.admins ?? 0, icon: <ShieldCheck /> },
                  { label: 'Active now', value: s?.activeUsers ?? 0, icon: <Activity /> },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col-reverse rounded-xl bg-surface-muted p-4">
                    <dt className="mt-1 flex items-center gap-1.5 text-sm text-muted [&_svg]:size-3.5">
                      {item.icon}
                      {item.label}
                    </dt>
                    <dd className="font-display text-2xl font-bold tabular-nums text-foreground">
                      {loading ? <Skeleton className="h-7 w-12" /> : formatNumber(item.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
