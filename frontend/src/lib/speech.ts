'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

export const SPEECH_LANGUAGES = [
  { value: 'rw-RW', label: 'Kinyarwanda' },
  { value: 'en-US', label: 'English' },
  { value: 'fr-FR', label: 'French' },
];

/* eslint-disable @typescript-eslint/no-explicit-any */
function getRecognitionCtor(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const noopSubscribe = () => () => {};

export type RecognitionStatus = 'idle' | 'starting' | 'listening' | 'error';

/**
 * Continuous speech recognition. Keeps one recognizer per language, restarts it when the
 * browser ends a session on its own, and accumulates final results into `transcript`.
 */
export function useSpeechRecognition(lang: string) {
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => !!getRecognitionCtor(),
    () => true
  );
  const [status, setStatus] = useState<RecognitionStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const wantListeningRef = useRef(false);

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => setStatus('listening');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += text;
        else interimText += text;
      }
      if (finalText) setTranscript((prev) => `${prev} ${finalText}`.trim());
      setInterim(interimText);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      wantListeningRef.current = false;
      setStatus('error');
      setError(
        event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? 'Microphone access was blocked. Allow it in your browser settings and try again.'
          : event.error === 'network'
            ? 'Speech recognition needs an internet connection.'
            : 'Speech recognition stopped unexpectedly. Please try again.'
      );
    };

    recognition.onend = () => {
      if (wantListeningRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          wantListeningRef.current = false;
        }
      }
      setInterim('');
      setStatus((s) => (s === 'error' ? s : 'idle'));
    };

    recognitionRef.current = recognition;

    // If the language changed while listening, carry on in the new language
    if (wantListeningRef.current) {
      try {
        recognition.start();
      } catch {
        /* ignore */
      }
    }

    return () => {
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, [lang]);

  // Stop listening when the component unmounts
  useEffect(
    () => () => {
      wantListeningRef.current = false;
    },
    []
  );

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    setError('');
    setStatus('starting');
    wantListeningRef.current = true;
    try {
      recognitionRef.current.start();
    } catch {
      // Already started — fine
    }
  }, []);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setStatus('idle');
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterim('');
  }, []);

  return { supported, status, listening: status === 'listening' || status === 'starting', transcript, interim, error, start, stop, reset };
}

/** Speak text aloud using the best available voice for the language. */
export function speak(text: string, options: { lang?: string; rate?: number } = {}) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text.charAt(0).toUpperCase() + text.slice(1));
  utterance.rate = options.rate ?? 1;
  const langPrefix = (options.lang ?? 'en').slice(0, 2);
  const voices = synth.getVoices();
  const voice =
    voices.find((v) => v.lang.startsWith(langPrefix) && /Google|Natural|Premium/.test(v.name)) ??
    voices.find((v) => v.lang.startsWith(langPrefix)) ??
    voices.find((v) => v.lang.startsWith('en'));
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
}

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
