'use client';

import React from 'react';
import { Activity, BarChart3, Clock, Target, TrendingUp, Zap } from 'lucide-react';
import { PageHeader } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatNumber, formatRelativeTime } from '@/lib/utils';
import { useApi } from '@/lib/hooks';

interface AIStats {
  totalPredictions: number;
  avgAccuracy: number;
  avgProcessingTime: number;
  gestureDistribution: { _id: string; count: number }[];
}

interface AILog {
  _id: string;
  gestureRecognized: string;
  confidence: number;
  processingTime: number;
  createdAt: string;
}

async function fetchPerformance() {
  const [stats, logs] = await Promise.all([api.ai.getStats(), api.ai.getLogs(50)]);
  return { stats: stats as AIStats, logs: (Array.isArray(logs) ? logs : []) as AILog[] };
}

export default function AIPerformancePage() {
  const { data, loading, error, reload: load } = useApi(fetchPerformance, 'Could not load AI performance data.');
  const stats = data?.stats;
  const logs = data?.logs ?? [];

  const distribution = stats?.gestureDistribution ?? [];
  const maxCount = Math.max(1, ...distribution.map((g) => g.count));

  return (
    <>
      <PageHeader
        title="AI Performance"
        description="Monitor model accuracy, speed and gesture usage."
        actions={
          <Button variant="outline" onClick={load} isLoading={loading}>
            Refresh
          </Button>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total predictions" value={formatNumber(stats?.totalPredictions ?? 0)} icon={<Activity />} loading={loading} />
            <StatCard
              label="Avg. accuracy"
              value={`${((stats?.avgAccuracy ?? 0) * 100).toFixed(1)}%`}
              icon={<Target />}
              tone="emerald"
              loading={loading}
            />
            <StatCard
              label="Avg. processing"
              value={`${(stats?.avgProcessingTime ?? 0).toFixed(0)} ms`}
              icon={<Zap />}
              tone="violet"
              loading={loading}
            />
            <StatCard
              label="Top gesture"
              value={<span className="capitalize">{distribution[0]?._id ?? '—'}</span>}
              icon={<TrendingUp />}
              tone="amber"
              loading={loading}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  <BarChart3 className="size-4 text-subtle" />
                  Gesture distribution
                </CardTitle>
                <CardDescription>Most frequently recognised gestures.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))}
                  </div>
                ) : distribution.length === 0 ? (
                  <EmptyState icon={<BarChart3 />} title="No predictions yet" className="py-8" />
                ) : (
                  <ul className="space-y-3.5">
                    {distribution.slice(0, 10).map((item) => (
                      <li key={item._id}>
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <span className="font-medium capitalize text-foreground">{item._id || 'Unknown'}</span>
                          <span className="tabular-nums text-muted">{item.count.toLocaleString()}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-[width] duration-700"
                            style={{ width: `${(item.count / maxCount) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden lg:col-span-3">
              <CardHeader>
                <CardTitle>
                  <Clock className="size-4 text-subtle" />
                  Recent predictions
                </CardTitle>
                <CardDescription>The latest 15 recognitions across all users.</CardDescription>
              </CardHeader>
              <div className="mt-4">
                {loading ? (
                  <div className="space-y-3 px-6 pb-6">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : logs.length === 0 ? (
                  <EmptyState icon={<Clock />} title="No recent predictions" className="py-8" />
                ) : (
                  <Table>
                    <thead>
                      <tr>
                        <Th>Gesture</Th>
                        <Th className="text-right">Confidence</Th>
                        <Th className="hidden text-right sm:table-cell">Time</Th>
                        <Th className="text-right">When</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.slice(0, 15).map((log) => (
                        <Tr key={log._id}>
                          <Td className="font-medium capitalize text-foreground">{log.gestureRecognized}</Td>
                          <Td className="text-right tabular-nums">{((log.confidence ?? 0) * 100).toFixed(1)}%</Td>
                          <Td className="hidden text-right tabular-nums sm:table-cell">{log.processingTime ?? 0} ms</Td>
                          <Td className="whitespace-nowrap text-right text-subtle">{formatRelativeTime(log.createdAt)}</Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
