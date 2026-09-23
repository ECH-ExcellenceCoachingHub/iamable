'use client';

import React, { useState } from 'react';
import { AlertCircle, BrainCircuit, CheckCircle2, Clock, Loader2, Plus, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/app-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { toast } from '@/store/toast-store';
import { api } from '@/lib/api';
import { cn, formatRelativeTime, getErrorMessage } from '@/lib/utils';
import { useApi } from '@/lib/hooks';

interface Training {
  _id: string;
  trainingName: string;
  modelVersion: string;
  status: 'pending' | 'training' | 'completed' | 'failed';
  datasetSize?: number;
  epochs?: number;
  batchSize?: number;
  learningRate?: number;
  accuracy?: number;
  loss?: number;
  errorMessage?: string;
  createdAt: string;
}

const statusMeta: Record<Training['status'], { label: string; tone: BadgeTone; icon: React.ReactNode; iconClass: string }> = {
  pending: { label: 'Pending', tone: 'warning', icon: <Clock />, iconClass: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300' },
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

async function fetchTrainings(): Promise<Training[]> {
  const data = await api.ai.getTrainingHistory();
  return Array.isArray(data) ? data : [];
}

const emptyForm = { trainingName: '', modelVersion: '', datasetSize: '', epochs: '10', batchSize: '32', learningRate: '0.001' };

export default function AITrainingPage() {
  const { data, loading, error, reload: load } = useApi(fetchTrainings, 'Could not load training history.');
  const trainings = data ?? [];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
      await api.ai.createTraining({
        trainingName: form.trainingName.trim(),
        modelVersion: form.modelVersion.trim(),
        datasetSize: num(form.datasetSize),
        epochs: num(form.epochs),
        batchSize: num(form.batchSize),
        learningRate: num(form.learningRate),
      });
      toast.success('Training session created', `${form.trainingName} has been queued.`);
      setShowForm(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error('Could not create training session', getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="AI Training"
        description="Create and monitor model training sessions."
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus />
            New training
          </Button>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
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
            title="No training sessions yet"
            description="Start a training session to improve recognition accuracy."
            action={
              <Button onClick={() => setShowForm(true)} size="sm">
                <Plus />
                New training
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {trainings.map((t) => {
            const meta = statusMeta[t.status] ?? statusMeta.pending;
            const metrics = [
              { label: 'Dataset', value: t.datasetSize?.toLocaleString() },
              { label: 'Epochs', value: t.epochs },
              { label: 'Batch size', value: t.batchSize },
              { label: 'Learning rate', value: t.learningRate },
              { label: 'Accuracy', value: t.accuracy !== undefined ? `${(t.accuracy * 100).toFixed(2)}%` : undefined },
              { label: 'Loss', value: t.loss !== undefined ? t.loss.toFixed(4) : undefined },
            ].filter((m) => m.value !== undefined && m.value !== null);

            return (
              <Card key={t._id}>
                <CardContent className="flex gap-4">
                  <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5', meta.iconClass)}>{meta.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h2 className="font-semibold text-foreground">{t.trainingName}</h2>
                      <Badge tone={meta.tone} dot>
                        {meta.label}
                      </Badge>
                      <span className="ml-auto text-xs text-subtle">{formatRelativeTime(t.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-muted">v{t.modelVersion.replace(/^v/i, '')}</p>
                    {metrics.length > 0 && (
                      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        {metrics.map((m) => (
                          <div key={m.label} className="rounded-lg bg-surface-muted px-3 py-2">
                            <dt className="text-[11px] font-medium uppercase tracking-wider text-subtle">{m.label}</dt>
                            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{m.value}</dd>
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
        title="New training session"
        description="Configure the model and hyperparameters."
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="Training name" value={form.trainingName} onChange={set('trainingName')} placeholder="e.g. Kinyarwanda gestures" required />
            <Input label="Model version" value={form.modelVersion} onChange={set('modelVersion')} placeholder="e.g. 1.2.0" required />
          </div>
          <div className="grid grid-cols-2 gap-5">
            <Input label="Dataset size" type="number" min={0} value={form.datasetSize} onChange={set('datasetSize')} placeholder="Samples" />
            <Input label="Epochs" type="number" min={1} value={form.epochs} onChange={set('epochs')} />
            <Input label="Batch size" type="number" min={1} value={form.batchSize} onChange={set('batchSize')} />
            <Input label="Learning rate" type="number" step="0.0001" min={0} value={form.learningRate} onChange={set('learningRate')} />
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-5">
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting}>
              Start training
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
