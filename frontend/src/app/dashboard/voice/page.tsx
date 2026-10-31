'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Hand, Mic, MicOff, RotateCcw, Save, Settings, Stethoscope, Volume2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/app-shell';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/input';
import { Alert } from '@/components/ui/feedback';
import { SignPlayer } from '@/components/sign/sign-player';
import { SPEECH_LANGUAGES, isAndroid, speak, useSpeechRecognition } from '@/lib/speech';
import { useSignEngine } from '@/lib/use-sign-engine';
import { useTranslationRecorder, type TranslationDraft } from '@/lib/use-translation-recorder';
import { toast } from '@/store/toast-store';
import { cn, getErrorMessage } from '@/lib/utils';

/** A live mic that sends only exact zeros for this long is muted by the OS or a hardware key. */
const SILENT_MS = 3000;

/**
 * Tracks microphone input level (0–100) while `active` is true, and whether the mic is
 * muted outside the browser (track reports `muted`, or the signal is pure digital silence).
 */
function useMicLevel(active: boolean) {
  const [level, setLevel] = useState(0);
  const [muted, setMuted] = useState(false);
  const cleanupRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!active || !navigator.mediaDevices?.getUserMedia) return;
    let cancelled = false;
    let frame = 0;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const track = stream.getAudioTracks()[0];
        let trackMuted = !!track?.muted;
        let lastSignal = performance.now();
        if (track) {
          track.onmute = () => (trackMuted = true);
          track.onunmute = () => (trackMuted = false);
        }

        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(data);
          const sum = data.reduce((a, b) => a + b, 0);
          const now = performance.now();
          // Even a quiet room has a noise floor; exact zeros mean nothing is coming through
          if (sum > 0) lastSignal = now;
          setLevel(Math.min(100, (sum / data.length) * 1.2));
          setMuted(trackMuted || now - lastSignal > SILENT_MS);
          frame = requestAnimationFrame(tick);
        };
        tick();
        cleanupRef.current = () => {
          cancelAnimationFrame(frame);
          stream.getTracks().forEach((t) => t.stop());
          ctx.close();
        };
      })
      .catch(() => {
        /* Level meter is optional; recognition reports permission errors itself */
      });

    return () => {
      cancelled = true;
      cleanupRef.current();
      cleanupRef.current = () => {};
      setLevel(0);
      setMuted(false);
    };
  }, [active]);

  return { level, muted };
}

/** Explains how to unmute a mic that the browser can open but receives no sound from. */
function MicMutedHelp() {
  const isWindows = typeof navigator !== 'undefined' && /Windows/.test(navigator.userAgent);
  const isMac = typeof navigator !== 'undefined' && /Mac OS X/.test(navigator.userAgent);

  return (
    <Alert tone="warning" className="space-y-2">
      <p className="font-semibold">Your microphone is muted or turned off</p>
      <p>We can&apos;t hear any sound from it. The browser can&apos;t turn it back on, but you can:</p>
      <ol className="list-decimal space-y-1 pl-5">
        <li>Press your keyboard&apos;s mic mute key (often F4 or Fn + F4) so its light turns off.</li>
        {isMac ? (
          <li>Open System Settings → Sound → Input, select your mic and raise the input volume.</li>
        ) : (
          <li>Open Settings → System → Sound → Input, unmute your mic and raise the input volume.</li>
        )}
        <li>Unplug and reconnect a headset, or check its own mute switch.</li>
      </ol>
      <div className="flex flex-wrap gap-2 pt-1">
        {isWindows && (
          <a href="ms-settings:sound" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <Settings />
            Open sound settings
          </a>
        )}
        <Link href="/dashboard/voice/test" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          <Stethoscope />
          Run microphone test
        </Link>
      </div>
      <p className="text-xs opacity-80">This message disappears as soon as sound comes through.</p>
    </Alert>
  );
}

export default function VoiceToSignPage() {
  const [lang, setLang] = useState('rw-RW');
  const [saving, setSaving] = useState(false);
  const speech = useSpeechRecognition(lang);
  // On Android a second mic stream would starve recognition, so the meter stays off there
  const { level, muted: micMuted } = useMicLevel(speech.status === 'listening' && !isAndroid());

  const fullText = `${speech.transcript} ${speech.interim}`.trim();
  const engine = useSignEngine();
  const frames = useMemo(
    () => engine?.textToSignFrames(speech.transcript, lang.startsWith('rw') ? 'rw' : lang.startsWith('en') ? 'en' : 'auto') ?? [],
    [engine, speech.transcript, lang]
  );

  const toggle = () => (speech.listening ? speech.stop() : speech.start());

  const transcript = speech.transcript.trim();
  const draft = useMemo<TranslationDraft | null>(
    () =>
      transcript && engine
        ? {
            inputType: 'voice-to-sign',
            inputContent: transcript,
            translatedText: `Signed (${engine.describeFrames(frames)}): ${transcript}`,
            confidenceScore: 1,
          }
        : null,
    [transcript, engine, frames]
  );
  const recorder = useTranslationRecorder(draft);

  const handleSave = async () => {
    if (!transcript) return;
    setSaving(true);
    try {
      await recorder.save();
      toast.success('Translation saved', 'You can find it in Saved translations.');
    } catch (err) {
      toast.error('Could not save translation', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const statusLabel =
    speech.status === 'listening' ? 'Listening' : speech.status === 'starting' ? 'Starting…' : speech.status === 'error' ? 'Stopped' : 'Ready';

  return (
    <>
      <PageHeader title="Voice to Sign" description="Speak naturally and see your words converted into sign language." />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <Mic className="size-4 text-subtle" />
              Voice input
            </CardTitle>
            <CardDescription>Choose a language, then tap the microphone.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!speech.supported && (
              <Alert tone="warning">Speech recognition isn&apos;t supported in this browser. Please use Chrome, Edge or Safari.</Alert>
            )}
            {speech.error && <Alert>{speech.error}</Alert>}
            {micMuted && <MicMutedHelp />}

            <div className="flex flex-col items-center gap-4 rounded-xl bg-gradient-to-br from-brand-50 to-violet-50 px-6 py-8 ring-1 ring-inset ring-brand-100 dark:from-brand-500/10 dark:to-violet-500/10 dark:ring-brand-500/20">
              <div className="relative">
                {speech.status === 'listening' && (
                  <span
                    className="absolute inset-0 rounded-full bg-red-500/30 transition-transform duration-100"
                    style={{ transform: `scale(${1 + level / 60})` }}
                    aria-hidden="true"
                  />
                )}
                <button
                  onClick={toggle}
                  disabled={!speech.supported}
                  className={cn(
                    'relative flex size-24 items-center justify-center rounded-full text-white shadow-xl transition-all active:scale-95 disabled:opacity-50',
                    speech.listening ? 'bg-red-500 shadow-red-500/30 hover:bg-red-600' : 'bg-brand-600 shadow-brand-600/30 hover:bg-brand-700'
                  )}
                  aria-label={speech.listening ? 'Stop listening' : 'Start listening'}
                  aria-pressed={speech.listening}
                >
                  {speech.listening ? <MicOff className="size-9" /> : <Mic className="size-9" />}
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground" aria-live="polite">
                <span
                  className={cn(
                    'size-2 rounded-full',
                    speech.status === 'listening'
                      ? 'animate-pulse bg-red-500'
                      : speech.status === 'starting'
                        ? 'animate-pulse bg-amber-500'
                        : speech.status === 'error'
                          ? 'bg-red-500'
                          : 'bg-slate-400'
                  )}
                />
                {statusLabel}
              </div>
            </div>

            <Select label="Language" value={lang} onChange={(e) => setLang(e.target.value)}>
              {SPEECH_LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </Select>

            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">Transcript</p>
              <div className="min-h-28 rounded-xl border border-border bg-surface-muted/50 p-4 text-sm leading-relaxed" aria-live="polite">
                {fullText ? (
                  <p className="text-foreground">
                    {speech.transcript}
                    {speech.interim && <span className="text-subtle"> {speech.interim}</span>}
                  </p>
                ) : (
                  <p className="text-subtle">Your words will appear here as you speak.</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => speak(speech.transcript, { lang })} disabled={!speech.transcript}>
                <Volume2 />
                Speak
              </Button>
              <Button onClick={handleSave} disabled={!speech.transcript} isLoading={saving}>
                {!saving && <Save />}
                Save
              </Button>
              <Button
                variant="ghost"
                className="ml-auto"
                onClick={() => {
                  speech.stop();
                  speech.reset();
                }}
                disabled={!fullText && !speech.listening}
              >
                <RotateCcw />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>
              <Hand className="size-4 text-subtle" />
              Sign language
            </CardTitle>
            <CardDescription>
              {frames.length
                ? `${engine?.describeFrames(frames)}. Signs update as each phrase is recognised.`
                : 'Common words play as animated signs; other words are fingerspelled.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignPlayer frames={frames} emptyIcon={<Mic />} emptyText="Start speaking to see your words in sign language." />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
