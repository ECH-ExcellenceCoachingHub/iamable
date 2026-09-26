'use client';

import React, { useCallback, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Circle, Database, Hand, Plus, Trash2, Undo2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Alert, EmptyState, ErrorState, Progress, Skeleton } from '@/components/ui/feedback';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { toast } from '@/store/toast-store';
import { api } from '@/lib/api';
import { cn, formatRelativeTime, getErrorMessage } from '@/lib/utils';
import { useBodyTracker } from '@/lib/hand-tracking';
import { frameFeatures, MotionWindow, type BodyObservation } from '@/lib/body-features';
import { REST_LABEL } from '@/lib/sign-model';
import { GESTURE_LABELS } from '@/lib/sign-vocabulary';
import { CameraView } from './camera-view';
import type { Dataset } from './types';

const COUNTDOWN_SECONDS = 3;
/** A new clip is cut from the rolling window this often while recording. */
const CLIP_EVERY_MS = 150;
/** Clips per upload request, to keep request bodies small. */
const UPLOAD_CHUNK = 25;
const SUGGESTED_SIGNS = [...Object.values(GESTURE_LABELS).filter(Boolean), REST_LABEL];

type Recording = { sign: string; durationMs: number } & (
  | { phase: 'countdown'; secondsLeft: number }
  | { phase: 'capturing'; startedAt: number; elapsed: number; collected: number }
  | { phase: 'saving'; collected: number }
);

interface Props {
  dataset: Dataset | undefined;
  loading: boolean;
  error?: string;
  reload: () => void;
}

export function DatasetTab({ dataset, loading, error, reload }: Props) {
  const [label, setLabel] = useState('');
  const [seconds, setSeconds] = useState('10');
  const [recording, setRecordingState] = useState<Recording | null>(null);
  const [lastRecording, setLastRecording] = useState<{ label: string; count: number } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const recordingRef = useRef<Recording | null>(null);
  const bufferRef = useRef<number[][]>([]);
  const windowRef = useRef(new MotionWindow());
  const lastClipRef = useRef(0);
  const lastRenderRef = useRef(0);

  const setRecording = (next: Recording | null) => {
    recordingRef.current = next;
    setRecordingState(next);
  };

  const upload = useCallback(
    async (sign: string, clips: number[][]) => {
      if (!clips.length) {
        toast.error('Nothing was recorded', 'Make sure your head, shoulders and hands are in view, then try again.');
        setRecording(null);
        return;
      }
      let added = 0;
      let total = 0;
      const recordingId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      try {
        for (let i = 0; i < clips.length; i += UPLOAD_CHUNK) {
          const res = await api.ai.addSamples(sign, clips.slice(i, i + UPLOAD_CHUNK), recordingId);
          added += res.added;
          total = res.total;
        }
        toast.success(`Saved ${added} clips of "${sign}"`, `${total} clips in total for this sign.`);
      } catch (err) {
        toast.error('Could not save the recording', getErrorMessage(err));
      } finally {
        if (added) setLastRecording({ label: sign, count: added });
        setRecording(null);
        reload();
      }
    },
    [reload]
  );

  const onFrame = useCallback(
    (observation: BodyObservation, now: number) => {
      // Keep the rolling window filled even before recording, so the first clip is ready at once
      windowRef.current.push(now, frameFeatures(observation));
      const rec = recordingRef.current;
      if (rec?.phase !== 'capturing') return;

      if (now - lastClipRef.current >= CLIP_EVERY_MS) {
        const clip = windowRef.current.vector(now);
        if (clip) {
          bufferRef.current.push(clip);
          lastClipRef.current = now;
        }
      }
      const elapsed = now - rec.startedAt;
      if (elapsed >= rec.durationMs) {
        setRecording({ sign: rec.sign, durationMs: rec.durationMs, phase: 'saving', collected: bufferRef.current.length });
        void upload(rec.sign, bufferRef.current);
      } else if (now - lastRenderRef.current > 200) {
        lastRenderRef.current = now;
        setRecording({ ...rec, elapsed, collected: bufferRef.current.length });
      }
    },
    [upload]
  );

  const tracker = useBodyTracker(onFrame);

  const startRecording = (name = label) => {
    const sign = name.trim().replace(/\s+/g, ' ');
    if (!sign) {
      toast.error('Name the sign first', 'For example "muraho (hello)".');
      return;
    }
    setLabel(sign);
    bufferRef.current = [];
    const durationMs = Number(seconds) * 1000;
    let secondsLeft = COUNTDOWN_SECONDS;
    setRecording({ sign, durationMs, phase: 'countdown', secondsLeft });
    const timer = setInterval(() => {
      if (recordingRef.current?.phase !== 'countdown') {
        clearInterval(timer);
        return;
      }
      secondsLeft--;
      if (secondsLeft <= 0) {
        clearInterval(timer);
        lastClipRef.current = 0;
        setRecording({ sign, durationMs, phase: 'capturing', startedAt: performance.now(), elapsed: 0, collected: 0 });
      } else {
        setRecording({ sign, durationMs, phase: 'countdown', secondsLeft });
      }
    }, 1000);
  };

  const cancelRecording = () => setRecording(null);

  const undoLast = async () => {
    if (!lastRecording) return;
    try {
      await api.ai.undoLatestSamples(lastRecording.label, lastRecording.count);
      toast.success('Last recording removed');
      setLastRecording(null);
      reload();
    } catch (err) {
      toast.error('Could not remove the recording', getErrorMessage(err));
    }
  };

  const deleteSign = async (sign: string) => {
    if (!window.confirm(`Delete all recordings of "${sign}"? The next model you train won't know this sign.`)) return;
    setDeleting(sign);
    try {
      await api.ai.deleteSign(sign);
      toast.success(`Deleted "${sign}"`);
      if (lastRecording?.label === sign) setLastRecording(null);
      reload();
    } catch (err) {
      toast.error('Could not delete the sign', getErrorMessage(err));
    } finally {
      setDeleting(null);
    }
  };

  const signs = dataset?.signs ?? [];
  const min = dataset?.minSamplesPerSign ?? 5;
  const recommended = dataset?.recommendedSamplesPerSign ?? 100;
  const recommendedTakes = dataset?.recommendedRecordingsPerSign ?? 2;
  const busy = !!recording;
  const hasRest = signs.some((s) => s.label === REST_LABEL);
  const framing = !tracker.bodyVisible
    ? 'Step back so your head, shoulders and hands are in view'
    : tracker.handCount === 0
      ? 'Raise your hands into view'
      : null;

  const overlay = (
    <>
      {tracker.cameraOn && tracker.status === 'ready' && framing && (
        <p className="absolute inset-x-0 top-14 mx-auto w-fit rounded-full bg-amber-500/90 px-3 py-1 text-xs font-medium text-amber-950">{framing}</p>
      )}
      {recording && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10 text-white">
          {recording.phase === 'countdown' ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm">
                Get ready to sign <strong>{recording.sign}</strong>
                {recording.sign !== REST_LABEL && ' — repeat it naturally until the timer ends'}
              </p>
              <span className="font-display text-4xl font-bold tabular-nums">{recording.secondsLeft}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="inline-flex items-center gap-2">
                  <span className="size-2.5 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
                  {recording.phase === 'saving' ? 'Saving…' : `Recording "${recording.sign}"`}
                </span>
                <span className="tabular-nums">{recording.collected} clips</span>
              </div>
              <Progress
                value={recording.phase === 'saving' ? 100 : (recording.elapsed / recording.durationMs) * 100}
                barClassName="bg-red-500"
                label="Recording progress"
              />
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <Card className="xl:col-span-3">
        <CardHeader>
          <CardTitle>Record a sign</CardTitle>
          <CardDescription>
            The camera tracks your whole upper body, both hands and how they move. Stand so your head, shoulders and hands are in view, press record,
            and perform the sign again and again until the timer ends. Vary it a little (speed, distance, angle) so the model learns the sign, not one
            exact take.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <CameraView tracker={tracker} overlay={overlay} />

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <Input
              label="Sign name"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. muraho (hello)"
              list="sign-suggestions"
              disabled={busy}
              maxLength={80}
            />
            <Select label="Record for" value={seconds} onChange={(e) => setSeconds(e.target.value)} disabled={busy} wrapperClassName="sm:w-36">
              {['5', '10', '20'].map((n) => (
                <option key={n} value={n}>
                  {n} seconds
                </option>
              ))}
            </Select>
            <datalist id="sign-suggestions">
              {[...new Set([...signs.map((s) => s.label), ...SUGGESTED_SIGNS])].map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {busy ? (
              <Button variant="outline" onClick={cancelRecording} disabled={recording.phase === 'saving'}>
                Cancel
              </Button>
            ) : (
              <>
                <Button onClick={() => startRecording()} disabled={!tracker.cameraOn || tracker.status !== 'ready'}>
                  <Circle className="fill-current" />
                  Record {seconds} seconds
                </Button>
                <Button
                  variant="outline"
                  onClick={() => startRecording(REST_LABEL)}
                  disabled={!tracker.cameraOn || tracker.status !== 'ready'}
                  title="Record yourself not signing: hands down, resting, scratching your face…"
                >
                  <Hand />
                  Record &quot;no sign&quot;
                </Button>
              </>
            )}
            {lastRecording && !busy && (
              <Button variant="ghost" onClick={undoLast}>
                <Undo2 />
                Undo last recording ({lastRecording.count} × {lastRecording.label})
              </Button>
            )}
            {!tracker.cameraOn && <span className="text-sm text-muted">Start the camera to record.</span>}
          </div>

          {!hasRest && signs.length > 0 && (
            <Alert tone="info">
              Tip: also record <strong>&quot;no sign&quot;</strong> — yourself resting, hands down or moving without signing. It stops the model from
              reading random movement as a sign.
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden xl:col-span-2">
        <CardHeader>
          <CardTitle>
            <Database className="size-4 text-subtle" />
            Dataset
          </CardTitle>
          <CardDescription>
            {dataset
              ? `${dataset.totalSamples.toLocaleString()} clips across ${signs.length} sign${signs.length === 1 ? '' : 's'}.`
              : 'Recorded clips per sign.'}
          </CardDescription>
        </CardHeader>
        <div className="mt-4">
          {error ? (
            <div className="px-6 pb-6">
              <ErrorState message={error} onRetry={reload} />
            </div>
          ) : loading && !dataset ? (
            <div className="space-y-3 px-6 pb-6">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : signs.length === 0 ? (
            <EmptyState
              icon={<Database />}
              title="Nothing recorded yet"
              description="Record at least two different signs to train your first model."
              className="py-10"
            />
          ) : (
            <>
              {!dataset?.canTrain && (
                <Alert tone="warning" className="mx-6 mb-4">
                  You need at least 2 signs with {min}+ clips each before you can train. One 5-second recording is enough to start.
                </Alert>
              )}
              <Table>
                <thead>
                  <tr>
                    <Th>Sign</Th>
                    <Th>Clips</Th>
                    <Th className="sr-only">Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {signs.map((s) => {
                    const state = s.count < min ? 'low' : s.count < recommended || s.recordings < recommendedTakes ? 'ok' : 'good';
                    return (
                      <Tr key={s.label}>
                        <Td>
                          <p className="font-medium text-foreground">{s.label}</p>
                          <p className="text-xs text-subtle">
                            {s.recordings} recording{s.recordings === 1 ? '' : 's'} · {formatRelativeTime(s.lastAddedAt)}
                          </p>
                        </Td>
                        <Td className="min-w-40">
                          <div className="flex items-center gap-2 text-xs">
                            {state === 'low' ? (
                              <AlertTriangle className="size-3.5 text-amber-500" />
                            ) : (
                              <CheckCircle2 className={cn('size-3.5', state === 'good' ? 'text-emerald-500' : 'text-brand-500')} />
                            )}
                            <span className="tabular-nums text-foreground">{s.count}</span>
                            <span className="text-subtle">
                              {state === 'low'
                                ? `need ${min - s.count} more`
                                : s.recordings < recommendedTakes
                                  ? 'record once more for a fair test'
                                  : state === 'ok'
                                    ? `${recommended}+ recommended`
                                    : 'ready'}
                            </span>
                          </div>
                          <Progress
                            value={Math.min(100, (s.count / recommended) * 100)}
                            className="mt-1.5 h-1.5"
                            barClassName={state === 'low' ? 'bg-amber-500' : state === 'good' ? 'bg-emerald-500' : undefined}
                            label={`${s.label} clips`}
                          />
                        </Td>
                        <Td className="whitespace-nowrap text-right">
                          <Button variant="ghost" size="icon-sm" onClick={() => setLabel(s.label)} disabled={busy} aria-label={`Record more of ${s.label}`} title="Record more">
                            <Plus />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => deleteSign(s.label)}
                            isLoading={deleting === s.label}
                            disabled={busy}
                            aria-label={`Delete ${s.label}`}
                            title="Delete sign"
                            className="hover:text-red-600"
                          >
                            <Trash2 />
                          </Button>
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
