'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  CameraOff,
  Check,
  Copy,
  Delete,
  Hand,
  Loader2,
  Maximize2,
  MessageSquareReply,
  Mic,
  MicOff,
  Minimize2,
  Save,
  Space,
  SpellCheck,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Alert, Progress } from '@/components/ui/feedback';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { toast } from '@/store/toast-store';
import { cn, getErrorMessage } from '@/lib/utils';
import { SPEECH_LANGUAGES, speak, useSpeechRecognition } from '@/lib/speech';
import { GESTURE_GUIDE, GESTURE_LABELS } from '@/lib/sign-vocabulary';
import { useSignEngine } from '@/lib/use-sign-engine';
import { SignPlayer } from '@/components/sign/sign-player';
import { recogniseLetter, sampleVector, STATIC_LETTERS, type Point3 } from '@/lib/fingerspelling';
import { useFingerspellStore } from '@/store/fingerspell-store';

const TASKS_VISION_VERSION = '0.10.35';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';
/**
 * MediaPipe's WASM runtime writes routine status lines ("INFO: Created TensorFlow Lite XNNPACK
 * delegate for CPU.", glog "I0923 …"/"W0923 …" lines) to console.error, which the Next.js dev
 * overlay reports as errors. Drop just those lines; everything else still reaches console.error.
 */
const MEDIAPIPE_LOG = /^(INFO:|WARNING: .*(tflite|mediapipe)|[IW]\d{4} \d{2}:\d{2}:\d{2})/i;
let mediaPipeLogsSilenced = false;
function silenceMediaPipeLogs() {
  if (mediaPipeLogsSilenced) return;
  mediaPipeLogsSilenced = true;
  const original = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && MEDIAPIPE_LOG.test(args[0])) return;
    original(...args);
  };
}
if (typeof window !== 'undefined') silenceMediaPipeLogs();

const MIN_SCORE = 0.65;
const BUFFER_SIZE = 4;
const STABLE_FRAMES = 3;
/** Letters change quickly and look alike mid-transition, so they must hold longer. */
const LETTER_BUFFER_SIZE = 8;
const LETTER_STABLE_FRAMES = 6;
/** Lowering the hand for this long ends the current word. */
const WORD_BREAK_MS = 1000;
/** Examples captured per "Record" press, one every few frames. */
const SAMPLES_PER_RECORDING = 20;
const SAMPLE_EVERY_N_FRAMES = 3;

// Bone connections between MediaPipe's 21 hand landmarks
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

type ModelStatus = 'loading' | 'ready' | 'error';
type Mode = 'gestures' | 'letters';
type Landmark = { x: number; y: number };

function drawHand(canvas: HTMLCanvasElement, video: HTMLVideoElement, landmarks: Landmark[] | null) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!landmarks) return;
  const w = canvas.width;
  const h = canvas.height;
  const scale = Math.max(1, w / 640);
  ctx.lineWidth = 3 * scale;
  ctx.strokeStyle = 'rgba(89, 154, 255, 0.9)';
  ctx.lineCap = 'round';
  for (const [a, b] of HAND_CONNECTIONS) {
    ctx.beginPath();
    ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
    ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
    ctx.stroke();
  }
  ctx.fillStyle = '#3aea80';
  for (const p of landmarks) {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

export default function SignToTextPage() {
  const studioRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognizerRef = useRef<any>(null);
  const lastSignRef = useRef('');
  const autoSpeakRef = useRef(true);
  const modeRef = useRef<Mode>('gestures');
  const spelledRef = useRef('');
  const recordingRef = useRef<{ letter: string; remaining: number } | null>(null);

  const [modelStatus, setModelStatus] = useState<ModelStatus>('loading');
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [handVisible, setHandVisible] = useState(false);
  const [currentSign, setCurrentSign] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [sequence, setSequence] = useState<string[]>([]);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mode, setModeState] = useState<Mode>('gestures');
  const [spelled, setSpelledState] = useState('');
  const [teachLetter, setTeachLetter] = useState('A');
  const [recording, setRecording] = useState<{ letter: string; remaining: number } | null>(null);
  const samples = useFingerspellStore((s) => s.samples);
  const clearLetterSamples = useFingerspellStore((s) => s.clearLetter);
  const clearAllSamples = useFingerspellStore((s) => s.clearAll);

  const setSpelled = useCallback((text: string) => {
    spelledRef.current = text;
    setSpelledState(text);
  }, []);

  /** Close the word being spelled and speak it. */
  const endWord = useCallback(() => {
    const text = spelledRef.current;
    if (!text || text.endsWith(' ')) return;
    setSpelled(text + ' ');
    const word = text.split(' ').pop();
    if (word && autoSpeakRef.current) speak(word.toLowerCase());
  }, [setSpelled]);

  const setMode = (next: Mode) => {
    modeRef.current = next;
    setModeState(next);
    lastSignRef.current = '';
    setCurrentSign('');
    setConfidence(0);
  };

  // Reply panel (hearing person answers by voice or text)
  const [replyLang, setReplyLang] = useState('rw-RW');
  const [replyText, setReplyText] = useState('');
  const speech = useSpeechRecognition(replyLang);
  const replySource = replyText || speech.transcript;
  const signEngine = useSignEngine();
  const replyFrames = useMemo(
    () => signEngine?.textToSignFrames(replySource, replyText ? 'auto' : replyLang.startsWith('rw') ? 'rw' : 'en') ?? [],
    [signEngine, replySource, replyText, replyLang]
  );

  useEffect(() => {
    autoSpeakRef.current = autoSpeak;
  }, [autoSpeak]);

  // Load the MediaPipe gesture recognizer once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { GestureRecognizer, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const fileset = await FilesetResolver.forVisionTasks(
          `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`
        );
        const recognizer = await GestureRecognizer.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        if (cancelled) {
          recognizer.close();
          return;
        }
        recognizerRef.current = recognizer;
        setModelStatus('ready');
      } catch (err) {
        console.error('Failed to load gesture recognizer:', err);
        if (!cancelled) setModelStatus('error');
      }
    })();
    return () => {
      cancelled = true;
      recognizerRef.current?.close?.();
      recognizerRef.current = null;
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    lastSignRef.current = '';
    recordingRef.current = null;
    setRecording(null);
    setCameraOn(false);
    setHandVisible(false);
    setConfidence(0);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const processFrames = useCallback(() => {
    const buffer: string[] = [];
    let lastVideoTime = -1;
    let lastHandVisible = false;
    let frame = 0;
    let handGoneSince = 0;

    const loop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const recognizer = recognizerRef.current;
      if (!video || !streamRef.current) return;

      if (recognizer && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        try {
          const now = performance.now();
          const results = recognizer.recognizeForVideo(video, now);
          const landmarks: Landmark[] | null = results?.landmarks?.[0] ?? null;
          const world: Point3[] | null = results?.worldLandmarks?.[0] ?? null;
          if (canvas) drawHand(canvas, video, landmarks);
          frame++;

          const visible = !!landmarks;
          if (visible !== lastHandVisible) {
            lastHandVisible = visible;
            setHandVisible(visible);
          }

          // Capture the user's own examples for the letter they're teaching
          const rec = recordingRef.current;
          if (rec && world && frame % SAMPLE_EVERY_N_FRAMES === 0) {
            useFingerspellStore.getState().addSample(rec.letter, sampleVector(world));
            const next = rec.remaining > 1 ? { ...rec, remaining: rec.remaining - 1 } : null;
            recordingRef.current = next;
            setRecording(next);
            if (!next) toast.success(`Saved your "${rec.letter}"`, 'The camera will now match your handshape for this letter.');
          }

          const letters = modeRef.current === 'letters';
          let label = '';
          let score = 0;
          if (letters) {
            const guess = world && !rec ? recogniseLetter(world, useFingerspellStore.getState().samples) : null;
            if (guess) {
              label = guess.letter;
              score = guess.score;
            }
            if (visible) handGoneSince = 0;
            else if (!handGoneSince) handGoneSince = now;
            else if (now - handGoneSince > WORD_BREAK_MS) endWord();
          } else {
            const top = results?.gestures?.[0]?.[0];
            if (top && top.categoryName !== 'None' && top.score > MIN_SCORE) {
              label = GESTURE_LABELS[top.categoryName] || top.categoryName;
              score = top.score;
            }
          }

          if (!label) {
            buffer.length = 0;
            // A letter can repeat ("LL") once the hand leaves the shape; a gesture only once the hand leaves view.
            if (!visible || letters) lastSignRef.current = '';
          } else {
            buffer.push(label);
            if (buffer.length > (letters ? LETTER_BUFFER_SIZE : BUFFER_SIZE)) buffer.shift();
            // Require most recent frames to agree before accepting a sign
            const stable = buffer.filter((g) => g === label).length >= (letters ? LETTER_STABLE_FRAMES : STABLE_FRAMES);
            if (stable) {
              setConfidence(score);
              if (label !== lastSignRef.current) {
                lastSignRef.current = label;
                setCurrentSign(label);
                if (letters) {
                  setSpelled(spelledRef.current + label);
                } else {
                  setSequence((s) => [...s, label]);
                  if (autoSpeakRef.current) speak(label.split(' (')[0], { lang: 'rw' });
                }
              }
            }
          }
        } catch {
          // Recognizer may throw on the first frames while warming up
        }
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
  }, [endWord, setSpelled]);

  const startCamera = async () => {
    setCameraError('');
    setCameraStarting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      processFrames();
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      setCameraError(
        name === 'NotAllowedError'
          ? 'Camera access was blocked. Allow camera access in your browser settings and try again.'
          : name === 'NotFoundError'
            ? 'No camera was found. Connect a camera and try again.'
            : name === 'NotReadableError'
              ? 'Your camera is being used by another app. Close it and try again.'
              : 'Could not start the camera in this browser.'
      );
      stopCamera();
    } finally {
      setCameraStarting(false);
    }
  };

  // Focus mode: make the studio fill the screen
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === studioRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else studioRef.current?.requestFullscreen?.().catch(() => toast.error('Full screen is not available in this browser.'));
  };

  const sentence = sequence.join(' · ');
  const outputText = mode === 'letters' ? spelled.trim() : sequence.join(' ') || currentSign;
  const outputSpoken = mode === 'letters' ? spelled.trim().toLowerCase() : sequence.map((s) => s.split(' (')[0]).join(', ') || currentSign;

  const startRecording = () => {
    const next = { letter: teachLetter, remaining: SAMPLES_PER_RECORDING };
    recordingRef.current = next;
    setRecording(next);
  };

  const handleSave = async () => {
    const text = outputText;
    if (!text) return;
    setSaving(true);
    try {
      await api.translations.create({
        inputType: 'sign-to-text',
        inputContent: mode === 'letters' ? 'Fingerspelling' : 'Hand gesture',
        translatedText: text,
        confidenceScore: confidence,
      });
      toast.success('Translation saved', 'You can find it in your recent translations.');
    } catch (err) {
      toast.error('Could not save translation', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const clearAll = () => {
    setSequence([]);
    setSpelled('');
    setCurrentSign('');
    setConfidence(0);
    lastSignRef.current = '';
  };

  return (
    <>
      <PageHeader
        title="Sign to Text"
        description="Sign in front of your camera and see your signs translated into text and speech."
        actions={
          <Button variant="outline" onClick={toggleFullscreen}>
            <Maximize2 />
            Focus mode
          </Button>
        }
      />

      <div ref={studioRef} className={cn('grid gap-6 lg:grid-cols-5', isFullscreen && 'overflow-auto bg-background p-6')}>
        {/* Camera */}
        <Card className="overflow-hidden lg:col-span-3">
          <div className="relative aspect-video bg-slate-950">
            <video ref={videoRef} className="size-full -scale-x-100 object-cover" playsInline muted aria-label="Camera preview" />
            <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 size-full -scale-x-100 object-cover" aria-hidden="true" />

            {!cameraOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-900 to-slate-950 p-6 text-center">
                <span className="flex size-16 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                  <Camera className="size-7 text-slate-300" />
                </span>
                <div>
                  <p className="font-semibold text-white">Camera is off</p>
                  <p className="mt-1 text-sm text-slate-400">Start your camera and hold one hand clearly in view.</p>
                </div>
                <Button onClick={startCamera} isLoading={cameraStarting} variant="gradient">
                  {!cameraStarting && <Camera />}
                  Start camera
                </Button>
              </div>
            )}

            {cameraOn && (
              <div className="absolute inset-x-3 top-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-xs font-semibold text-white shadow">
                  <span className="size-1.5 animate-pulse rounded-full bg-white" /> Live
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur',
                    handVisible ? 'bg-emerald-500/90 text-white' : 'bg-black/50 text-slate-200'
                  )}
                >
                  <Hand className="size-3.5" />
                  {handVisible ? 'Hand detected' : 'Show your hand'}
                </span>
              </div>
            )}

            {cameraOn && modelStatus === 'loading' && (
              <div className="absolute inset-x-0 bottom-3 flex justify-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur">
                  <Loader2 className="size-3.5 animate-spin" /> Loading hand-tracking model…
                </span>
              </div>
            )}
          </div>

          <CardContent className="space-y-4">
            {cameraError && <Alert>{cameraError}</Alert>}
            {modelStatus === 'error' && (
              <Alert tone="warning">
                The hand-tracking model couldn&apos;t be loaded. Check your internet connection and reload the page.
              </Alert>
            )}
            <div className="flex flex-wrap items-center gap-3">
              {cameraOn ? (
                <Button variant="secondary" onClick={stopCamera}>
                  <CameraOff />
                  Stop camera
                </Button>
              ) : (
                <Button onClick={startCamera} isLoading={cameraStarting}>
                  {!cameraStarting && <Camera />}
                  Start camera
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setAutoSpeak((v) => !v)}
                aria-pressed={autoSpeak}
                title="Speak each new sign aloud"
              >
                {autoSpeak ? <Volume2 /> : <VolumeX />}
                Auto-speak {autoSpeak ? 'on' : 'off'}
              </Button>
              <div className="flex rounded-xl bg-surface-muted p-1 ring-1 ring-inset ring-border" role="radiogroup" aria-label="Recognition mode">
                {(
                  [
                    { id: 'gestures', label: 'Gestures', icon: <Hand /> },
                    { id: 'letters', label: 'Fingerspelling', icon: <SpellCheck /> },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    role="radio"
                    aria-checked={mode === m.id}
                    onClick={() => setMode(m.id)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors [&_svg]:size-4',
                      mode === m.id ? 'bg-surface text-foreground shadow-sm ring-1 ring-border' : 'text-muted hover:text-foreground'
                    )}
                  >
                    {m.icon}
                    {m.label}
                  </button>
                ))}
              </div>
              <span className="ml-auto flex items-center gap-2 text-xs text-muted">
                <span
                  className={cn(
                    'size-2 rounded-full',
                    modelStatus === 'ready' ? 'bg-emerald-500' : modelStatus === 'loading' ? 'animate-pulse bg-amber-500' : 'bg-red-500'
                  )}
                />
                {modelStatus === 'ready' ? 'Model ready' : modelStatus === 'loading' ? 'Loading model' : 'Model unavailable'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Output */}
        <Card className="flex flex-col lg:col-span-2">
          <CardHeader>
            <CardTitle>Translation</CardTitle>
            <CardDescription>
              {mode === 'letters'
                ? 'Spell with the ASL alphabet. Lower your hand for a moment to end a word.'
                : 'The latest recognised sign and the full sequence.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <div
              className="flex min-h-40 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-accent-50 p-6 text-center ring-1 ring-inset ring-brand-100 dark:from-brand-500/10 dark:to-accent-500/5 dark:ring-brand-500/20"
              aria-live="polite"
            >
              {currentSign ? (
                <>
                  <p className="font-display text-3xl font-bold text-foreground sm:text-4xl">{currentSign.split(' (')[0]}</p>
                  {currentSign.includes('(') && <p className="mt-1 text-muted">{currentSign.split('(')[1]?.replace(')', '')}</p>}
                  <div className="mt-4 flex w-full max-w-56 items-center gap-2">
                    <Progress value={confidence * 100} label="Confidence" barClassName="bg-gradient-to-r from-brand-500 to-accent-500" />
                    <span className="w-10 text-right text-xs font-medium tabular-nums text-muted">{Math.round(confidence * 100)}%</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted">
                  {!cameraOn ? 'Start the camera to begin.' : mode === 'letters' ? 'Hold a letter handshape still…' : 'Waiting for a sign…'}
                </p>
              )}
            </div>

            {mode === 'letters' ? (
              <div className="flex-1">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-subtle">Spelled text</p>
                  {spelled && (
                    <button onClick={clearAll} className="flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground">
                      <Trash2 className="size-3.5" /> Clear
                    </button>
                  )}
                </div>
                <p className="min-h-12 break-words rounded-xl bg-surface-muted px-3 py-2 font-mono text-xl tracking-wider text-foreground ring-1 ring-inset ring-border">
                  {spelled || <span className="font-sans text-sm tracking-normal text-subtle">Letters you sign appear here.</span>}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm" onClick={endWord} disabled={!spelled || spelled.endsWith(' ')}>
                    <Space />
                    Space
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSpelled(spelled.slice(0, -1))} disabled={!spelled}>
                    <Delete />
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
            <div className="flex-1">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-subtle">Sequence</p>
                {sequence.length > 0 && (
                  <button onClick={clearAll} className="flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground">
                    <Trash2 className="size-3.5" /> Clear
                  </button>
                )}
              </div>
              {sequence.length > 0 ? (
                <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto scrollbar-thin" aria-label={sentence}>
                  {sequence.map((sign, i) => (
                    <Badge key={i} tone="brand" className="normal-case">
                      {sign.split(' (')[0]}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-subtle">Recognised signs will appear here in order.</p>
              )}
            </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={() => speak(outputSpoken)} disabled={!outputText}>
                <Volume2 />
                <span className="hidden sm:inline">Speak</span>
              </Button>
              <Button variant="outline" onClick={handleCopy} disabled={!outputText}>
                {copied ? <Check /> : <Copy />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
              </Button>
              <Button onClick={handleSave} disabled={!outputText} isLoading={saving}>
                {!saving && <Save />}
                <span className="hidden sm:inline">Save</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {isFullscreen && (
          <div className="lg:col-span-5">
            <Button variant="outline" onClick={toggleFullscreen}>
              <Minimize2 />
              Exit focus mode
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Reply */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>
              <MessageSquareReply className="size-4 text-subtle" />
              Reply
            </CardTitle>
            <CardDescription>Let the other person answer by voice or text — their words are shown as signs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Select label="Spoken language" value={replyLang} onChange={(e) => setReplyLang(e.target.value)} wrapperClassName="sm:w-44">
                {SPEECH_LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </Select>
              <Button
                variant={speech.listening ? 'destructive' : 'outline'}
                onClick={() => {
                  if (speech.listening) {
                    speech.stop();
                  } else {
                    setReplyText('');
                    speech.reset();
                    speech.start();
                  }
                }}
                disabled={!speech.supported}
                className="sm:flex-1"
              >
                {speech.listening ? <MicOff /> : <Mic />}
                {speech.listening ? 'Stop listening' : 'Reply by voice'}
              </Button>
            </div>
            {!speech.supported && <Alert tone="warning">Voice input isn&apos;t supported in this browser. Try Chrome or Edge.</Alert>}
            {speech.error && <Alert>{speech.error}</Alert>}
            {speech.listening && (
              <p className="flex items-center gap-2 text-sm text-muted" aria-live="polite">
                <span className="size-2 animate-pulse rounded-full bg-red-500" />
                {speech.interim || 'Listening… speak now'}
              </p>
            )}
            <Input
              label="Or type a reply"
              placeholder="Type text to convert to sign language…"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
            {replyFrames.length > 0 && <SignPlayer frames={replyFrames} emptyIcon={<Hand />} emptyText="" />}
          </CardContent>
        </Card>

        {/* Gesture guide / teach the camera */}
        {mode === 'letters' ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                <SpellCheck className="size-4 text-subtle" />
                Teach the camera your handshapes
              </CardTitle>
              <CardDescription>
                If a letter is misread, record your own version. Hold the handshape still while it records; your examples are
                matched first, and they stay on this device.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-2">
                <Select
                  label="Letter"
                  value={teachLetter}
                  onChange={(e) => setTeachLetter(e.target.value)}
                  wrapperClassName="w-24"
                  disabled={!!recording}
                >
                  {STATIC_LETTERS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </Select>
                <Button onClick={startRecording} disabled={!cameraOn || !!recording} className="flex-1">
                  {recording ? `Recording ${recording.letter}… hold still` : `Record my "${teachLetter}"`}
                </Button>
              </div>
              {recording && (
                <Progress
                  value={((SAMPLES_PER_RECORDING - recording.remaining) / SAMPLES_PER_RECORDING) * 100}
                  label="Recording progress"
                />
              )}
              {!cameraOn && <p className="text-xs text-subtle">Start the camera to record.</p>}
              <ul className="grid grid-cols-6 gap-1.5" aria-label="Recorded examples per letter">
                {STATIC_LETTERS.map((l) => {
                  const count = samples[l]?.length ?? 0;
                  return (
                    <li key={l}>
                      <button
                        onClick={() => setTeachLetter(l)}
                        title={count ? `${count} examples — click to select` : 'No examples yet'}
                        className={cn(
                          'w-full rounded-lg py-1.5 text-center text-sm font-semibold ring-1 ring-inset transition-colors',
                          count ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/25' : 'bg-surface-muted text-muted ring-border',
                          teachLetter === l && 'ring-2 ring-brand-500'
                        )}
                      >
                        {l}
                        {count > 0 && <span className="block text-[10px] font-normal">{count}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => clearLetterSamples(teachLetter)} disabled={!samples[teachLetter]?.length}>
                  Forget my &quot;{teachLetter}&quot;
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.confirm('Delete all your recorded handshapes?') && clearAllSamples()}
                  disabled={!Object.keys(samples).length}
                >
                  <Trash2 />
                  Delete all
                </Button>
              </div>
              <p className="text-xs leading-relaxed text-subtle">
                J and Z are traced in the air, so they can&apos;t be read from a still image yet.
              </p>
            </CardContent>
          </Card>
        ) : (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <Hand className="size-4 text-subtle" />
              Gesture guide
            </CardTitle>
            <CardDescription>Signs the studio currently recognises.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {GESTURE_GUIDE.map((g) => (
                <li key={g.gesture} className="flex items-center gap-3 py-2.5">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-surface-muted text-lg" aria-hidden="true">
                    {g.emoji}
                  </span>
                  <span className="flex-1 text-sm text-muted">{g.gesture}</span>
                  <span className="text-sm font-medium text-foreground">{g.word}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        )}
      </div>
    </>
  );
}
