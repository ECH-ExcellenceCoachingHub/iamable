'use client';

import React from 'react';
import { Activity, AlertTriangle, BarChart3, CheckCircle2, Clock, GraduationCap, Rocket, Target, XCircle, Zap } from 'lucide-react';
import { PageHeader } from '@/components/layout/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { formatNumber, formatRelativeTime } from '@/lib/utils';
import { useApi } from '@/lib/hooks';

interface AIStats {
  totalPredictions: number;
  avgConfidence: number;
  avgProcessingTime: number;
  verifiedPredictions: number;
  verifiedAccuracy: number | null;
  gestureDistribution: { _id: string | null; count: number }[];
  perSignAccuracy: { _id: string; total: number; correct: number; accuracy: number }[];
  bySource: { _id: string | null; count: number }[];
  activeModel: {
    trainingName: string;
    modelVersion: string;
    valAccuracy?: number;
    labels?: string[];
    deployedAt?: string;
    datasetSize?: number;
  } | null;
}

interface AILog {
  _id: string;
  gestureRecognized: string;
  confidence: number;
  processingTime?: number;
  source?: string;
  modelVersion?: string;
  expected?: string;
  correct?: boolean;
  createdAt: string;
}

const SOURCE_NAMES: Record<string, string> = {
  'sign-to-text': 'Sign to Text',
  'knowledge-check': 'Knowledge check',
  api: 'API',
};

const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;

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
  const perSign = stats?.perSignAccuracy ?? [];
  const active = stats?.activeModel;
  const sources = stats?.bySource ?? [];

  return (
    <>
      <PageHeader
        title="AI Performance"
        description="How well the sign recogniser is doing in real use and in knowledge checks."
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
            <StatCard
              label="Knowledge-check accuracy"
              value={stats?.verifiedAccuracy === null || stats?.verifiedAccuracy === undefined ? '—' : pct(stats.verifiedAccuracy)}
              icon={<Target />}
              tone="emerald"
              loading={loading && !stats}
              hint={
                stats?.verifiedPredictions
                  ? `${formatNumber(stats.verifiedPredictions)} tested signs`
                  : 'Run a knowledge check on the AI Training page'
              }
            />
            <StatCard
              label="Signs recognised"
              value={formatNumber(stats?.totalPredictions ?? 0)}
              icon={<Activity />}
              loading={loading && !stats}
              hint={sources.map((s) => `${SOURCE_NAMES[s._id ?? ''] ?? 'Other'}: ${formatNumber(s.count)}`).join(' · ') || undefined}
            />
            <StatCard
              label="Avg. confidence"
              value={pct(stats?.avgConfidence ?? 0)}
              icon={<Zap />}
              tone="violet"
              loading={loading && !stats}
              hint="How sure the model was, not whether it was right"
            />
            <StatCard
              label="Avg. processing"
              value={`${(stats?.avgProcessingTime ?? 0).toFixed(0)} ms`}
              icon={<Clock />}
              tone="amber"
              loading={loading && !stats}
            />
          </div>

          <Card className="mt-6">
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300 [&_svg]:size-5">
                <Rocket />
              </span>
              {loading && !stats ? (
                <Skeleton className="h-10 w-72" />
              ) : active ? (
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">
                    Model in use: {active.trainingName} <span className="font-mono text-sm text-muted">v{active.modelVersion.replace(/^v/i, '')}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {active.labels?.length ?? 0} trained signs · {active.valAccuracy !== undefined ? pct(active.valAccuracy) : '—'} accuracy on unseen samples
                    {active.deployedAt ? ` · deployed ${formatRelativeTime(active.deployedAt)}` : ''}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-foreground">Built-in gestures only</p>
                  <p className="text-sm text-muted">No trained model is deployed. Sign to Text recognises the 7 built-in gestures.</p>
                </div>
              )}
              <Button href="/admin/ai-training" variant="outline" size="sm" className="sm:ml-auto">
                Open AI Training
              </Button>
            </CardContent>
          </Card>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>
                  <GraduationCap className="size-4 text-subtle" />
                  Accuracy per sign
                </CardTitle>
                <CardDescription>From knowledge checks, where the real sign is known. Weakest first.</CardDescription>
              </CardHeader>
              <div className="mt-4">
                {loading && !stats ? (
                  <div className="space-y-3 px-6 pb-6">
                    {[0, 1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : perSign.length === 0 ? (
                  <EmptyState
                    icon={<GraduationCap />}
                    title="No knowledge checks yet"
                    description="Run one from AI Training → Check knowledge to measure real accuracy."
                    className="py-8"
                  />
                ) : (
                  <Table>
                    <thead>
                      <tr>
                        <Th>Sign</Th>
                        <Th className="text-right">Correct</Th>
                        <Th className="text-right">Accuracy</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {perSign.map((s) => (
                        <Tr key={s._id}>
                          <Td className="font-medium text-foreground">
                            <span className="inline-flex items-center gap-2">
                              {s.accuracy >= 0.8 ? (
                                <CheckCircle2 className="size-4 text-emerald-500" aria-label="Good" />
                              ) : (
                                <AlertTriangle className="size-4 text-amber-500" aria-label="Needs more training" />
                              )}
                              {s._id}
                            </span>
                          </Td>
                          <Td className="text-right tabular-nums">
                            {s.correct} / {s.total}
                          </Td>
                          <Td className="text-right font-medium tabular-nums text-foreground">{pct(s.accuracy, 0)}</Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  <BarChart3 className="size-4 text-subtle" />
                  Most recognised signs
                </CardTitle>
                <CardDescription>Across Sign to Text and knowledge checks.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading && !stats ? (
                  <div className="space-y-4">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-6 w-full" />
                    ))}
                  </div>
                ) : distribution.length === 0 ? (
                  <EmptyState icon={<BarChart3 />} title="No predictions yet" description="Signs recognised in Sign to Text appear here." className="py-8" />
                ) : (
                  <ul className="space-y-3.5">
                    {distribution.map((item) => (
                      <li key={item._id ?? 'unknown'}>
                        <div className="mb-1.5 flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">{item._id || 'Unknown'}</span>
                          <span className="tabular-nums text-muted">{item.count.toLocaleString()}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                          <div
                            className="h-full rounded-full bg-brand-500 transition-[width] duration-700"
                            style={{ width: `${(item.count / maxCount) * 100}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6 overflow-hidden">
            <CardHeader>
              <CardTitle>
                <Clock className="size-4 text-subtle" />
                Recent predictions
              </CardTitle>
              <CardDescription>The latest 20 recognitions across all users.</CardDescription>
            </CardHeader>
            <div className="mt-4">
              {loading && !stats ? (
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
                      <Th>Recognised as</Th>
                      <Th>Result</Th>
                      <Th className="hidden md:table-cell">Where</Th>
                      <Th className="hidden md:table-cell">Model</Th>
                      <Th className="text-right">Confidence</Th>
                      <Th className="text-right">When</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.slice(0, 20).map((log) => (
                      <Tr key={log._id}>
                        <Td className="font-medium text-foreground">{log.gestureRecognized}</Td>
                        <Td>
                          {log.correct === true ? (
                            <Badge tone="success">
                              <CheckCircle2 className="size-3" />
                              Correct
                            </Badge>
                          ) : log.correct === false ? (
                            <Badge tone="danger" title={`Expected ${log.expected}`}>
                              <XCircle className="size-3" />
                              Was {log.expected}
                            </Badge>
                          ) : (
                            <span className="text-subtle">—</span>
                          )}
                        </Td>
                        <Td className="hidden md:table-cell">{SOURCE_NAMES[log.source ?? ''] ?? 'API'}</Td>
                        <Td className="hidden font-mono text-xs md:table-cell">{log.modelVersion ?? '—'}</Td>
                        <Td className="text-right tabular-nums">{pct(log.confidence ?? 0)}</Td>
                        <Td className="whitespace-nowrap text-right text-subtle">{formatRelativeTime(log.createdAt)}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>
          </Card>
        </>
      )}
    </>
  );
}
