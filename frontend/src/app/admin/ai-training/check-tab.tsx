'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, FlaskConical, GraduationCap, RotateCcw, SkipForward, Target, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Alert, EmptyState, Progress, Skeleton } from '@/components/ui/feedback';
import { api } from '@/lib/api';
import { cn, getErrorMessage } from '@/lib/utils';
import { useBodyTracker } from '@/lib/hand-tracking';
import { frameFeatures, handsInClip, MotionWindow, type BodyObservation } from '@/lib/body-features';
import { classifySign, isCompatibleModel, REST_LABEL, type SignModel, type SignPrediction } from '@/lib/sign-model';
import { CameraView } from './camera-view';
import { pct, type Training } from './types';

/** Pause before each question so the tester can change handshape. */
const READY_MS = 1500;
/** Time allowed to show each sign. */
const ANSWER_MS = 6000;
const FEEDBACK_MS = 1400;
/** Consecutive frames the same confident guess must hold to count as the answer. */
const STABLE_FRAMES = 12;
const MIN_PROBABILITY = 0.6;
const MAX_ROUNDS = 20;

interface QuizResult {
  expected: string;
  predicted: string;
  confidence: number;
  correct: boolean;
}

interface QuizState {
  queue: string[];
  index: number;
  phase: 'ready' | 'answering' | 'feedback' | 'done';
  phaseStart: number;
  streakLabel: string;
  streak: number;
  confSum: number;
  votes: Record<string, number>;
  results: QuizResult[];
  /** ms since phaseStart when this snapshot was rendered */
  elapsed?: number;
}

function shuffle<T>(list: T[]) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Props {
  trainings: Training[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function CheckTab({ trainings, selectedId, onSelect }: Props) {
  const completed = trainings.filter((t) => t.status === 'completed' && t.noveltyCheck);
  const runId = selectedId ?? completed.find((t) => t.isActive)?._id ?? completed[0]?._id ?? null;

  // Keyed by run so switching models never shows the previous one's results
  const [loaded, setLoaded] = useState<{ runId: string; model?: SignModel; error?: string } | null>(null);
  const current = loaded && loaded.runId === runId ? loaded : null;
  const model = current?.model ?? null;
  const modelError = current?.error ?? '';
  const [live, setLive] = useState<SignPrediction[]>([]);
  /** Whether the current movement resembles a trained sign at all (null = no hands / no clip). */
  const [liveKnown, setLiveKnown] = useState<boolean | null>(null);
  const [quiz, setQuiz] = useState<QuizState | null>(null);

  const modelRef = useRef<SignModel | null>(null);
  const quizRef = useRef<QuizState | null>(null);
  const frameRef = useRef(0);
  const lastRenderRef = useRef(0);
  const windowRef = useRef(new MotionWindow());

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    modelRef.current = null;
    api.ai
      .getTrainingModel(runId)
      .then((m: SignModel) => {
        if (cancelled) return;
        if (!isCompatibleModel(m)) {
          setLoaded({ runId, error: 'This model was trained on the old single-hand format. Train a new model to test it here.' });
          return;
        }
        modelRef.current = m;
        setLoaded({ runId, model: m });
      })
      .catch((err) => !cancelled && setLoaded({ runId, error: getErrorMessage(err, 'Could not load this model.') }));
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const updateQuiz = (next: QuizState | null) => {
    quizRef.current = next;
    setQuiz(next ? { ...next } : null);
  };

  const answer = useCallback((q: QuizState, predicted: string, confidence: number, now: number) => {
    const expected = q.queue[q.index];
    const result = { expected, predicted, confidence, correct: predicted === expected };
    q.results.push(result);
    q.phase = 'feedback';
    q.phaseStart = now;
    const m = modelRef.current;
    // Knowledge-check answers feed the per-sign accuracy on the AI Performance page
    api.ai
      .logPrediction({
        gesture: predicted || 'not recognised',
        confidence,
        modelVersion: m?.modelVersion,
        source: 'knowledge-check',
        expected,
      })
      .catch(() => {});
  }, []);

  const onFrame = useCallback(
    (observation: BodyObservation, now: number) => {
      const m = modelRef.current;
      windowRef.current.push(now, frameFeatures(observation));
      const clip = m && observation.hands.length ? windowRef.current.vector(now) : null;
      // Same rules as Sign to Text: hands must be in view, and the movement must resemble a trained sign
      const result = m && clip && handsInClip(clip) >= 0.5 ? classifySign(m, clip) : null;
      frameRef.current++;
      if (frameRef.current % 3 === 0) {
        setLive(result?.predictions.slice(0, 3) ?? []);
        setLiveKnown(result ? !!result.sign : null);
      }

      const q = quizRef.current;
      if (!q || q.phase === 'done') return;
      const elapsed = now - q.phaseStart;
      let changed = false;

      if (q.phase === 'ready' && elapsed > READY_MS) {
        Object.assign(q, { phase: 'answering', phaseStart: now, streak: 0, streakLabel: '', confSum: 0, votes: {} });
        changed = true;
      } else if (q.phase === 'answering') {
        const top = result?.sign;
        // Unknown movements and "no sign" are never answers; keep waiting for a real one
        if (top && top.label !== REST_LABEL && top.probability >= MIN_PROBABILITY) {
          q.votes[top.label] = (q.votes[top.label] ?? 0) + 1;
          if (top.label === q.streakLabel) {
            q.streak++;
            q.confSum += top.probability;
          } else {
            q.streakLabel = top.label;
            q.streak = 1;
            q.confSum = top.probability;
          }
          if (q.streak >= STABLE_FRAMES) {
            answer(q, top.label, q.confSum / q.streak, now);
            changed = true;
          }
        }
        if (q.phase === 'answering' && elapsed > ANSWER_MS) {
          const best = Object.entries(q.votes).sort((a, b) => b[1] - a[1])[0];
          answer(q, best?.[0] ?? '', 0, now);
          changed = true;
        }
      } else if (q.phase === 'feedback' && elapsed > FEEDBACK_MS) {
        q.index++;
        q.phase = q.index >= q.queue.length ? 'done' : 'ready';
        q.phaseStart = now;
        changed = true;
      }

      // Re-render on phase changes and a few times a second for the countdown
      if (changed || now - lastRenderRef.current > 200) {
        lastRenderRef.current = now;
        setQuiz({ ...q, elapsed });
      }
    },
    [answer]
  );

  const tracker = useBodyTracker(onFrame);

  const startQuiz = () => {
    if (!model) return;
    const signs = model.labels.filter((l) => l !== REST_LABEL);
    const labels = shuffle(signs);
    // Each sign once; with few signs, ask each twice so a lucky guess counts less
    const queue = (labels.length < 6 ? [...labels, ...shuffle(signs)] : labels).slice(0, MAX_ROUNDS);
    updateQuiz({ queue, index: 0, phase: 'ready', phaseStart: performance.now(), streakLabel: '', streak: 0, confSum: 0, votes: {}, results: [] });
  };

  const skip = () => {
    const q = quizRef.current;
    if (!q || q.phase === 'done') return;
    q.index++;
    q.phase = q.index >= q.queue.length ? 'done' : 'ready';
    q.phaseStart = performance.now();
    updateQuiz(q);
  };

  if (completed.length === 0) {
    return (
      <Card>
        <EmptyState icon={<FlaskConical />} title="Nothing to test yet" description="Train a model first, then check what it has learned here." />
      </Card>
    );
  }

  const results = quiz?.results ?? [];
  const correct = results.filter((r) => r.correct).length;
  const target = quiz && quiz.phase !== 'done' ? quiz.queue[quiz.index] : null;
  const lastResult = quiz?.phase === 'feedback' ? results.at(-1) : null;
  const elapsed = quiz?.elapsed ?? 0;

  const overlay = quiz && quiz.phase !== 'done' && target && (
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4 pt-12 text-white">
      {lastResult ? (
        <div className="flex items-center gap-3">
          {lastResult.correct ? <CheckCircle2 className="size-8 text-emerald-400" /> : <XCircle className="size-8 text-red-400" />}
          <div>
            <p className="font-semibold">{lastResult.correct ? 'Correct!' : 'Not quite'}</p>
            <p className="text-sm text-slate-300">
              Model saw: {lastResult.predicted || 'nothing it recognised'}
              {lastResult.confidence ? ` (${pct(lastResult.confidence, 0)})` : ''}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-slate-300">
            Sign {quiz.index + 1} of {quiz.queue.length} {quiz.phase === 'ready' ? '· get ready' : ''}
          </p>
          <p className="font-display text-2xl font-bold">{target}</p>
          {quiz.phase === 'answering' && (
            <Progress value={100 - (elapsed / ANSWER_MS) * 100} barClassName="bg-white" className="bg-white/20 ring-0" label="Time left" />
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <Card className="xl:col-span-3">
        <CardHeader>
          <CardTitle>
            <GraduationCap className="size-4 text-subtle" />
            Knowledge check
          </CardTitle>
          <CardDescription>
            The quiz asks for each sign the model knows. Make the sign and hold it; the model has {ANSWER_MS / 1000} seconds to recognise it. Results are
            saved to AI Performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select label="Model to test" value={runId ?? ''} onChange={(e) => onSelect(e.target.value)} disabled={!!quiz && quiz.phase !== 'done'}>
            {completed.map((t) => (
              <option key={t._id} value={t._id}>
                {t.trainingName} · v{t.modelVersion.replace(/^v/i, '')} · {pct(t.valAccuracy)}
                {t.isActive ? ' · in use' : ''}
              </option>
            ))}
          </Select>

          <CameraView tracker={tracker} overlay={overlay} />
          {modelError && <Alert>{modelError}</Alert>}

          <div className="flex flex-wrap gap-2">
            {quiz && quiz.phase !== 'done' ? (
              <>
                  <Button variant="outline" onClick={skip}>
                    <SkipForward />
                    Skip sign
                  </Button>
                  <Button variant="ghost" onClick={() => updateQuiz(null)}>
                    Stop quiz
                  </Button>
              </>
            ) : (
              <Button onClick={startQuiz} disabled={!model || !tracker.cameraOn || tracker.status !== 'ready'}>
                {quiz ? <RotateCcw /> : <Target />}
                {quiz ? 'Run again' : 'Start knowledge check'}
              </Button>
            )}
            {!tracker.cameraOn && <span className="self-center text-sm text-muted">Start the camera first.</span>}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6 xl:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>What the model sees</CardTitle>
            <CardDescription>Its top guesses for the current frame.</CardDescription>
          </CardHeader>
          <CardContent>
            {!model && !modelError ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : live.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">
                {!tracker.cameraOn ? 'Start the camera to see live guesses.' : tracker.handCount === 0 ? 'Raise your hands to sign.' : 'Show a sign to the camera.'}
              </p>
            ) : (
              <>
                {liveKnown === false && (
                  <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                    Not a trained sign — this movement doesn&apos;t look like anything the model was taught, so it is ignored.
                  </p>
                )}
                <ul className={cn('space-y-3', liveKnown === false && 'opacity-50')}>
                  {live.map((p, i) => (
                    <li key={p.label}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className={cn('font-medium', i === 0 ? 'text-foreground' : 'text-muted')}>{p.label}</span>
                        <span className="tabular-nums text-muted">{pct(p.probability, 0)}</span>
                      </div>
                      <Progress
                        value={p.probability * 100}
                        className="h-1.5"
                        barClassName={i === 0 && liveKnown && p.probability >= MIN_PROBABILITY ? 'bg-emerald-500' : 'bg-slate-400'}
                        label={`${p.label} probability`}
                      />
                    </li>
                  ))}
                </ul>
              </>
            )}
            {model && (
              <p className="mt-4 text-xs text-subtle">
                Knows {model.labels.filter((l) => l !== REST_LABEL).length} signs: {model.labels.filter((l) => l !== REST_LABEL).join(', ')}
              </p>
            )}
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>
                Score: {correct} / {results.length}
              </CardTitle>
              <CardDescription>
                {quiz?.phase === 'done'
                  ? correct === results.length
                    ? 'Perfect. The model knows every sign.'
                    : 'Record more samples for the signs marked ✗, then train again.'
                  : 'Quiz in progress…'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={(correct / results.length) * 100} barClassName="bg-emerald-500" label="Score" />
              <ul className="mt-4 space-y-1.5 text-sm">
                {results.map((r, i) => (
                  <li key={i} className="flex items-center gap-2">
                    {r.correct ? (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-500" aria-label="Correct" />
                    ) : (
                      <XCircle className="size-4 shrink-0 text-red-500" aria-label="Wrong" />
                    )}
                    <span className="font-medium text-foreground">{r.expected}</span>
                    {!r.correct && <span className="truncate text-muted">→ {r.predicted || 'not recognised'}</span>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
