'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  Clock,
  FlaskConical,
  Loader2,
  Play,
  RefreshCw,
  Rocket,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Switch } from '@/components/ui/switch';
import { Alert, EmptyState, ErrorState, Progress, Skeleton } from '@/components/ui/feedback';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { toast } from '@/store/toast-store';
import { api } from '@/lib/api';
import { cn, formatRelativeTime, getErrorMessage } from '@/lib/utils';
import { TrainingChart } from './training-chart';
import { isRunning, pct, type Dataset, type Training } from './types';

const statusMeta: Record<Training['status'], { label: string; tone: BadgeTone; icon: React.ReactNode; iconClass: string }> = {
  pending: { label: 'Queued', tone: 'warning', icon: <Clock />, iconClass: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300' },
  training: {
    label: 'Training',
    tone: 'brand',
    icon: <Loader2 className="animate-spin" />,
    iconClass: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300',
  },
  completed: {
    label: 'Completed',
    tone: 'success',
    icon: <CheckCircle2 />,
    iconClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
  },
  failed: { label: 'Failed', tone: 'danger', icon: <XCircle />, iconClass: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300' },
};

const defaults = { trainingName: '', epochs: '60', batchSize: '32', learningRate: '0.005', hiddenUnits: '64', validationSplit: '20' };

/** Plain-language verdict on a finished run. */
function verdict(t: Training): { tone: 'success' | 'info' | 'warning'; text: string } | null {
  if (t.status !== 'completed' || t.valAccuracy === undefined) return null;
  const gap = (t.accuracy ?? 0) - t.valAccuracy;
  if (t.valAccuracy >= 0.9 && gap < 0.1) return { tone: 'success', text: 'Excellent: the model recognises signs it has not seen before reliably.' };
  if (gap >= 0.15)
    return {
      tone: 'warning',
      text: 'The model memorised its training samples but struggles with new ones. Record more varied samples (different distances, angles and people).',
    };
  if (t.valAccuracy >= 0.75) return { tone: 'info', text: 'Good. Record more samples for the weakest signs below to improve it further.' };
  return { tone: 'warning', text: 'Low accuracy. Some signs look too similar or have too few samples. Check the weakest signs below.' };
}

function formatDuration(ms?: number) {
  if (!ms) return '—';
  return ms < 1000 ? `${ms} ms` : ms < 60_000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms / 60_000)} min`;
}

interface Props {
  trainings: Training[];
  dataset: Dataset | undefined;
  loading: boolean;
  error?: string;
  reload: () => void;
  onTest: (training: Training) => void;
}

export function RunsTab({ trainings, dataset, loading, error, reload, onTest }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(defaults);
  const [autoDeploy, setAutoDeploy] = useState(true);
  const [retraining, setRetraining] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const running = trainings.some(isRunning);
  const active = trainings.find((t) => t.isActive);
  const canTrain = !!dataset?.canTrain && !running;

  const set = (key: keyof typeof defaults) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const run = await api.ai.createTraining({
        trainingName: form.trainingName.trim() || undefined,
        epochs: Number(form.epochs),
        batchSize: Number(form.batchSize),
        learningRate: Number(form.learningRate),
        hiddenUnits: Number(form.hiddenUnits),
        validationSplit: Number(form.validationSplit) / 100,
        autoDeploy,
      });
      toast.success('Training started', `${run.trainingName} is learning from ${dataset?.totalSamples ?? 0} samples.`);
      setShowForm(false);
      setForm(defaults);
      setExpanded(run._id);
      reload();
    } catch (err) {
      toast.error('Could not start training', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const act = async (id: string, action: () => Promise<unknown>, success: string) => {
    setBusyId(id);
    try {
      await action();
      toast.success(success);
      reload();
    } catch (err) {
      toast.error('Something went wrong', getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  /** Opens the form; `from` pre-fills it with an earlier run's name and settings. */
  const openForm = (from?: Training) => {
    setForm(
      from
        ? {
            trainingName: from.trainingName,
            epochs: String(from.epochs ?? defaults.epochs),
            batchSize: String(from.batchSize ?? defaults.batchSize),
            learningRate: String(from.learningRate ?? defaults.learningRate),
            hiddenUnits: String(from.hiddenUnits ?? defaults.hiddenUnits),
            validationSplit: String(Math.round((from.validationSplit ?? 0.2) * 100)),
          }
        : defaults
    );
    setAutoDeploy(from?.autoDeploy ?? true);
    setRetraining(from?.trainingName ?? null);
    setShowForm(true);
  };
  const retrainTitle = running ? 'A run is in progress' : !dataset?.canTrain ? 'Record more samples first' : 'Train again on your current recordings';

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5',
              active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-surface-muted text-subtle'
            )}
          >
            <Rocket />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {active && active.noveltyCheck
                ? `In use: ${active.trainingName} (v${active.modelVersion.replace(/^v/i, '')})`
                : active
                  ? 'Deployed model is outdated — train a new one'
                  : 'No custom model in use'}
            </p>
            <p className="truncate text-sm text-muted">
              {active && active.noveltyCheck
                ? `Sign to Text recognises ${active.labels?.length ?? 0} trained signs · ${pct(active.valAccuracy)} accuracy on unseen samples`
                : 'Sign to Text uses the 7 built-in gestures. Train and deploy a model to add your own signs.'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {active && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => act(active._id, () => api.ai.undeployModel(), 'Custom model switched off')}
              isLoading={busyId === active._id}
            >
              Stop using
            </Button>
          )}
          <Button size="sm" onClick={() => openForm()} disabled={!canTrain} title={running ? 'A run is in progress' : !dataset?.canTrain ? 'Record more samples first' : undefined}>
            <Play />
            Train new model
          </Button>
        </div>
      </div>

      {!dataset?.canTrain && !loading && (
        <Alert tone="info" className="mb-4">
          Go to the <strong>Dataset</strong> tab and record at least {dataset?.minSamplesPerSign ?? 5} samples for 2 or more signs. Then you can train.
        </Alert>
      )}

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && trainings.length === 0 ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <Card key={i}>
              <CardContent className="flex gap-4">
                <Skeleton className="size-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-3 h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : trainings.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BrainCircuit />}
            title="No training runs yet"
            description="Once your dataset is ready, train a model. It takes a few seconds and you can watch it learn."
            action={
              <Button onClick={() => openForm()} size="sm" disabled={!canTrain}>
                <Play />
                Train new model
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {trainings.map((t) => {
            const meta = statusMeta[t.status] ?? statusMeta.pending;
            const live = isRunning(t);
            const open = live || expanded === t._id;
            const outdated = t.status === 'completed' && !t.noveltyCheck;
            const v = outdated ? null : verdict(t);
            const perClass = [...(t.modelMetrics?.perClass ?? [])].sort((a, b) => a.f1 - b.f1);
            const confusions = topConfusions(t);
            const metrics = [
              { label: 'Signs', value: t.labels?.length || undefined },
              { label: 'Samples', value: t.datasetSize?.toLocaleString() },
              { label: 'Unseen accuracy', value: t.valAccuracy !== undefined ? pct(t.valAccuracy) : undefined, strong: true },
              { label: 'Training accuracy', value: t.accuracy !== undefined ? pct(t.accuracy) : undefined },
              { label: 'Loss', value: t.valLoss !== undefined ? t.valLoss.toFixed(3) : undefined },
              { label: 'Time', value: t.trainingTime ? formatDuration(t.trainingTime) : undefined },
            ].filter((m) => m.value !== undefined && m.value !== null);

            return (
              <Card key={t._id} className={cn(t.isActive && 'ring-2 ring-emerald-500/40')}>
                <CardContent className="flex gap-4">
                  <span className={cn('hidden size-10 shrink-0 items-center justify-center rounded-xl sm:flex [&_svg]:size-5', meta.iconClass)}>{meta.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h2 className="font-semibold text-foreground">{t.trainingName}</h2>
                      <Badge tone={meta.tone} dot>
                        {meta.label}
                      </Badge>
                      {t.isActive && (
                        <Badge tone="success">
                          <Rocket className="size-3" />
                          In use
                        </Badge>
                      )}
                      <span className="ml-auto text-xs text-subtle">{formatRelativeTime(t.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-muted">
                      v{t.modelVersion.replace(/^v/i, '')}
                      {t.epochs ? ` · ${t.epochs} epochs · batch ${t.batchSize} · lr ${t.learningRate}` : ''}
                    </p>

                    {live && (
                      <div className="mt-4">
                        <div className="mb-1.5 flex justify-between text-xs text-muted">
                          <span>{t.status === 'pending' ? 'Preparing data…' : `Epoch ${t.currentEpoch ?? 0} of ${t.epochs}`}</span>
                          <span className="tabular-nums">{Math.round(((t.currentEpoch ?? 0) / (t.epochs || 1)) * 100)}%</span>
                        </div>
                        <Progress value={((t.currentEpoch ?? 0) / (t.epochs || 1)) * 100} label="Training progress" />
                      </div>
                    )}

                    {metrics.length > 0 && (
                      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        {metrics.map((m) => (
                          <div key={m.label} className="rounded-lg bg-surface-muted px-3 py-2">
                            <dt className="text-[11px] font-medium uppercase tracking-wider text-subtle">{m.label}</dt>
                            <dd className={cn('mt-0.5 text-sm font-semibold tabular-nums text-foreground', m.strong && 'text-base')}>{m.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}

                    {t.errorMessage && (
                      <p className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        {t.errorMessage}
                      </p>
                    )}
                    {!!t.skippedLabels?.length && (
                      <p className="mt-3 text-xs text-muted">
                        Left out (too few samples): {t.skippedLabels.join(', ')}
                      </p>
                    )}
                    {outdated && (
                      <Alert tone="warning" className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <span>
                          Trained with an older version that couldn&apos;t tell unknown movements apart, so it matched every movement to a sign. It is
                          no longer used. Your recordings are kept — retrain to fix it.
                        </span>
                        <Button size="sm" className="shrink-0" onClick={() => openForm(t)} disabled={!canTrain} title={retrainTitle}>
                          <RefreshCw />
                          Retrain
                        </Button>
                      </Alert>
                    )}
                    {v && (
                      <Alert tone={v.tone} className="mt-3">
                        {v.text}
                      </Alert>
                    )}

                    {open && (t.history?.length || live) ? (
                      <div className="mt-5 grid gap-6 lg:grid-cols-2">
                        <TrainingChart
                          title="Accuracy"
                          history={t.history ?? []}
                          totalEpochs={t.epochs}
                          markEpoch={t.bestEpoch}
                          domain={[0, 1]}
                          format={(n) => `${Math.round(n * 100)}%`}
                          series={[
                            { key: 'accuracy', name: 'Training', colorClass: 'text-brand-500' },
                            { key: 'valAccuracy', name: 'Unseen', colorClass: 'text-amber-500', dashed: true },
                          ]}
                        />
                        <TrainingChart
                          title="Loss (lower is better)"
                          history={t.history ?? []}
                          totalEpochs={t.epochs}
                          markEpoch={t.bestEpoch}
                          format={(n) => n.toFixed(2)}
                          series={[
                            { key: 'loss', name: 'Training', colorClass: 'text-brand-500' },
                            { key: 'valLoss', name: 'Unseen', colorClass: 'text-amber-500', dashed: true },
                          ]}
                        />
                      </div>
                    ) : null}

                    {open && !live && perClass.length > 0 && (
                      <div className="mt-5 grid gap-6 lg:grid-cols-5">
                        <div className="overflow-hidden rounded-xl border border-border lg:col-span-3">
                          <Table>
                            <thead>
                              <tr>
                                <Th>Sign (weakest first)</Th>
                                <Th className="text-right">Recognised</Th>
                                <Th className="text-right">Precision</Th>
                                <Th className="text-right">Tested</Th>
                              </tr>
                            </thead>
                            <tbody>
                              {perClass.map((c) => (
                                <Tr key={c.label}>
                                  <Td className="font-medium text-foreground">
                                    <span className="inline-flex items-center gap-2">
                                      {c.recall >= 0.9 ? (
                                        <CheckCircle2 className="size-4 text-emerald-500" aria-label="Good" />
                                      ) : (
                                        <AlertTriangle className="size-4 text-amber-500" aria-label="Needs work" />
                                      )}
                                      {c.label}
                                    </span>
                                  </Td>
                                  <Td className="text-right tabular-nums">{pct(c.recall, 0)}</Td>
                                  <Td className="text-right tabular-nums">{pct(c.precision, 0)}</Td>
                                  <Td className="text-right tabular-nums">{c.support}</Td>
                                </Tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                        <div className="lg:col-span-2">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-subtle">Most often confused</p>
                          {confusions.length === 0 ? (
                            <p className="text-sm text-muted">No mix-ups on the unseen samples.</p>
                          ) : (
                            <ul className="space-y-2">
                              {confusions.map((c) => (
                                <li key={`${c.actual}>${c.predicted}`} className="rounded-lg bg-surface-muted px-3 py-2 text-sm">
                                  <span className="font-medium text-foreground">{c.actual}</span>
                                  <span className="text-muted"> was read as </span>
                                  <span className="font-medium text-foreground">{c.predicted}</span>
                                  <span className="text-subtle"> · {c.count}×</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          <p className="mt-3 text-xs text-muted">
                            Tip: record more samples of these pairs, or make sure the handshapes really differ.
                          </p>
                        </div>
                      </div>
                    )}

                    {!live && (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {t.status === 'completed' && !outdated && !t.isActive && (
                          <Button size="sm" onClick={() => act(t._id, () => api.ai.deployTraining(t._id), `${t.trainingName} is now in use`)} isLoading={busyId === t._id}>
                            <Rocket />
                            Deploy
                          </Button>
                        )}
                        {t.status === 'completed' && !outdated && (
                          <Button size="sm" variant="outline" onClick={() => onTest(t)}>
                            <FlaskConical />
                            Test knowledge
                          </Button>
                        )}
                        {!outdated && (
                          <Button size="sm" variant="outline" onClick={() => openForm(t)} disabled={!canTrain} title={retrainTitle}>
                            <RefreshCw />
                            Retrain
                          </Button>
                        )}
                        {(t.history?.length ?? 0) > 0 && (
                          <Button size="sm" variant="ghost" onClick={() => setExpanded(open ? null : t._id)} aria-expanded={open}>
                            <ChevronDown className={cn('transition-transform', open && 'rotate-180')} />
                            {open ? 'Hide details' : 'Show details'}
                          </Button>
                        )}
                        {!t.isActive && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="ml-auto hover:text-red-600"
                            onClick={() => window.confirm(`Delete "${t.trainingName}"?`) && act(t._id, () => api.ai.deleteTraining(t._id), 'Training run deleted')}
                            disabled={busyId === t._id}
                          >
                            <Trash2 />
                            Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => !submitting && setShowForm(false)}
        title={retraining ? `Retrain "${retraining}"` : 'Train a new model'}
        description={
          dataset
            ? `Learns from ${dataset.totalSamples.toLocaleString()} samples of ${dataset.trainableSigns} signs. The defaults work well; you rarely need to change them.`
            : undefined
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input label="Name (optional)" value={form.trainingName} onChange={set('trainingName')} placeholder="e.g. Greetings and numbers" maxLength={120} />
          <details className="group rounded-xl border border-border px-4 py-3">
            <summary className="cursor-pointer select-none text-sm font-medium text-foreground">Advanced settings</summary>
            <div className="mt-4 grid grid-cols-2 gap-5">
              <Input label="Epochs" type="number" min={1} max={1000} value={form.epochs} onChange={set('epochs')} hint="Passes over the data" required />
              <Input label="Batch size" type="number" min={1} max={1024} value={form.batchSize} onChange={set('batchSize')} required />
              <Input label="Learning rate" type="number" step="any" min={0.00001} max={1} value={form.learningRate} onChange={set('learningRate')} required />
              <Input label="Hidden units" type="number" min={8} max={256} value={form.hiddenUnits} onChange={set('hiddenUnits')} hint="Model size" required />
              <Input
                label="Held-out for testing (%)"
                type="number"
                min={5}
                max={50}
                value={form.validationSplit}
                onChange={set('validationSplit')}
                hint="Samples kept aside to measure accuracy"
                required
              />
            </div>
          </details>
          <Switch
            checked={autoDeploy}
            onCheckedChange={setAutoDeploy}
            label="Deploy automatically"
            description="Put the new model to use if it scores at least as well as the current one."
            className="border border-border"
          />
          <div className="flex justify-end gap-2 border-t border-border pt-5">
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              <Play />
              Start training
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function topConfusions(t: Training) {
  const labels = t.labels ?? [];
  const matrix = t.modelMetrics?.confusion ?? [];
  const pairs: { actual: string; predicted: string; count: number }[] = [];
  matrix.forEach((row, i) =>
    row.forEach((count, j) => {
      if (i !== j && count > 0 && labels[i] && labels[j]) pairs.push({ actual: labels[i], predicted: labels[j], count });
    })
  );
  return pairs.sort((a, b) => b.count - a.count).slice(0, 5);
}
