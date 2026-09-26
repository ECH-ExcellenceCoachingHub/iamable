'use client';

import React, { useEffect, useState } from 'react';
import { BrainCircuit, Database, FlaskConical } from 'lucide-react';
import { PageHeader } from '@/components/layout/app-shell';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useApi } from '@/lib/hooks';
import { DatasetTab } from './dataset-tab';
import { RunsTab } from './runs-tab';
import { CheckTab } from './check-tab';
import { isRunning, type Dataset, type Training } from './types';

type Tab = 'dataset' | 'training' | 'check';

const POLL_MS = 1500;

async function fetchTrainings(): Promise<Training[]> {
  const data = await api.ai.getTrainingHistory();
  return Array.isArray(data) ? data : [];
}

const fetchDataset = (): Promise<Dataset> => api.ai.getDataset();

export default function AITrainingPage() {
  const [tab, setTab] = useState<Tab>('dataset');
  const [testRunId, setTestRunId] = useState<string | null>(null);
  const runs = useApi(fetchTrainings, 'Could not load training runs.');
  const dataset = useApi(fetchDataset, 'Could not load the dataset.');
  const trainings = runs.data ?? [];
  const running = trainings.some(isRunning);
  const { reload: reloadRuns } = runs;

  // Watch a run live while it trains
  useEffect(() => {
    if (!running) return;
    const id = setInterval(reloadRuns, POLL_MS);
    return () => clearInterval(id);
  }, [running, reloadRuns]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; hint?: string }[] = [
    { id: 'dataset', label: '1. Collect samples', icon: <Database />, hint: dataset.data ? `${dataset.data.signs.length} signs` : undefined },
    { id: 'training', label: '2. Train', icon: <BrainCircuit />, hint: running ? 'running' : trainings.length ? `${trainings.length} runs` : undefined },
    { id: 'check', label: '3. Check knowledge', icon: <FlaskConical /> },
  ];

  return (
    <>
      <PageHeader
        title="AI Training"
        description="Teach the sign recogniser new signs: record examples, train a model, then check what it learned."
      />

      <div role="tablist" aria-label="Training steps" className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-surface-muted p-1 ring-1 ring-border scrollbar-thin">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors [&_svg]:size-4',
              tab === t.id ? 'bg-surface text-foreground shadow-sm ring-1 ring-border' : 'text-muted hover:text-foreground'
            )}
          >
            {t.icon}
            {t.label}
            {t.hint && <span className="hidden text-xs font-normal text-subtle sm:inline">· {t.hint}</span>}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {tab === 'dataset' && <DatasetTab dataset={dataset.data} loading={dataset.loading} error={dataset.error} reload={dataset.reload} />}
        {tab === 'training' && (
          <RunsTab
            trainings={trainings}
            dataset={dataset.data}
            loading={runs.loading}
            error={runs.error}
            reload={runs.reload}
            onTest={(t) => {
              setTestRunId(t._id);
              setTab('check');
            }}
          />
        )}
        {tab === 'check' && <CheckTab trainings={trainings} selectedId={testRunId} onSelect={setTestRunId} />}
      </div>
    </>
  );
}
