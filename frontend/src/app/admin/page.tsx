'use client';

import React from 'react';
import Link from 'next/link';
import { Activity, ArrowUpRight, Clock, Cpu, FileWarning, HardDrive, MemoryStick, ShieldCheck, TrendingUp, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { ErrorState, Progress, Skeleton } from '@/components/ui/feedback';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
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

interface ReportStats {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
}

function usageColor(value: number, warn = 70, critical = 90) {
  if (value >= critical) return 'bg-red-500';
  if (value >= warn) return 'bg-amber-500';
  return 'bg-emerald-500';
}

async function fetchAdminStats() {
  const [dashboard, reports] = await Promise.all([api.admin.getDashboardStats(), api.admin.getStats()]);
  return { dashboard: dashboard as DashboardStats, reports: reports as ReportStats };
}

export default function AdminDashboardPage() {
  const { data, loading, error, reload: load } = useApi(fetchAdminStats, 'Could not load admin statistics.');
  const dashboard = data?.dashboard;
  const reports = data?.reports;

  const system = dashboard?.system;
  const resources = [
    { label: 'CPU', value: system?.cpuUsage ?? 0, icon: <Cpu className="size-4" /> },
    { label: 'Memory', value: system?.memoryUsage ?? 0, icon: <MemoryStick className="size-4" /> },
    { label: 'Disk', value: system?.diskUsage ?? 0, icon: <HardDrive className="size-4" />, warn: 80, critical: 95 },
  ];

  const resolvedPct = reports && reports.totalReports > 0 ? (reports.resolvedReports / reports.totalReports) * 100 : 0;

  return (
    <>
      <PageHeader title="Admin dashboard" description="Platform statistics and system health at a glance." />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total users" value={formatNumber(dashboard?.users.total ?? 0)} icon={<Users />} loading={loading} />
            <StatCard
              label="Verified users"
              value={formatNumber(dashboard?.users.active ?? 0)}
              icon={<TrendingUp />}
              tone="emerald"
              loading={loading}
            />
            <StatCard
              label="Pending reports"
              value={reports?.pendingReports ?? 0}
              icon={<FileWarning />}
              tone="amber"
              loading={loading}
            />
            <StatCard
              label="Total requests"
              value={formatNumber(system?.totalRequests ?? 0)}
              icon={<Activity />}
              tone="violet"
              loading={loading}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>System health</CardTitle>
                <Link
                  href="/admin/system"
                  className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  Details <ArrowUpRight className="size-4" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-5">
                {resources.map((r) => (
                  <div key={r.label}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        <span className="text-subtle">{r.icon}</span>
                        {r.label}
                      </span>
                      {loading ? <Skeleton className="h-4 w-10" /> : <span className="tabular-nums text-muted">{r.value.toFixed(1)}%</span>}
                    </div>
                    <Progress value={loading ? 0 : r.value} label={`${r.label} usage`} barClassName={usageColor(r.value, r.warn, r.critical)} />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-4 border-t border-border pt-5">
                  <div>
                    <p className="flex items-center gap-1.5 text-xs text-subtle">
                      <Clock className="size-3.5" /> Avg. response
                    </p>
                    <p className="mt-1 font-display text-xl font-bold text-foreground">
                      {loading ? '—' : `${(system?.averageResponseTime ?? 0).toFixed(0)} ms`}
                    </p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 text-xs text-subtle">
                      <ShieldCheck className="size-3.5" /> Error rate
                    </p>
                    <p className="mt-1 font-display text-xl font-bold text-foreground">
                      {loading ? '—' : `${((system?.errorRate ?? 0) * 100).toFixed(2)}%`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Reports</CardTitle>
                <Link
                  href="/admin/reports"
                  className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  Review <ArrowUpRight className="size-4" />
                </Link>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  {[
                    { label: 'Total', value: reports?.totalReports ?? 0, dot: 'bg-slate-400' },
                    { label: 'Pending', value: reports?.pendingReports ?? 0, dot: 'bg-amber-500' },
                    { label: 'Resolved', value: reports?.resolvedReports ?? 0, dot: 'bg-emerald-500' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between rounded-xl bg-surface-muted px-4 py-3">
                      <dt className="flex items-center gap-2 text-sm text-muted">
                        <span className={`size-2 rounded-full ${row.dot}`} />
                        {row.label}
                      </dt>
                      <dd className="font-display text-lg font-bold tabular-nums text-foreground">
                        {loading ? <Skeleton className="h-5 w-8" /> : row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-xs text-muted">
                    <span>Resolution rate</span>
                    <span className="tabular-nums">{resolvedPct.toFixed(0)}%</span>
                  </div>
                  <Progress value={resolvedPct} label="Resolution rate" barClassName="bg-emerald-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="Administrators" value={dashboard?.users.admins ?? 0} icon={<ShieldCheck />} tone="violet" loading={loading} />
            <StatCard label="Active sessions" value={system?.activeUsers ?? 0} icon={<Users />} tone="sky" loading={loading} />
            <StatCard
              label="Uptime"
              value={(() => {
                const s = system?.uptime ?? 0;
                const d = Math.floor(s / 86400);
                const h = Math.floor((s % 86400) / 3600);
                return d > 0 ? `${d}d ${h}h` : `${h}h ${Math.floor((s % 3600) / 60)}m`;
              })()}
              icon={<Clock />}
              tone="emerald"
              loading={loading}
            />
          </div>
        </>
      )}
    </>
  );
}
