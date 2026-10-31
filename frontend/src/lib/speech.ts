'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { canUseVosk, startVosk, voskModelFor } from './vosk';

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

/**
 * Android Chrome lets only one consumer use the mic at a time, and its `continuous` mode
 * ends early or returns no match, so there we recognise one phrase per session and restart.
 */
export const isAndroid = () => typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

const noopSubscribe = () => () => {};

export type RecognitionStatus = 'idle' | 'starting' | 'loading' | 'listening' | 'error';

/** 'browser' = the browser's own (cloud) recognition; 'device' = Vosk running on the device. */
export type RecognitionEngine = 'browser' | 'device';

const ENGINE_KEY = 'speech-engine';

/** Browsers that expose SpeechRecognition but never return results. */
const hasBrokenRecognition = () =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  !!(navigator as any).brave || /OPR\/|Vivaldi/.test(navigator.userAgent);

function defaultEngine(): RecognitionEngine {
  if (!getRecognitionCtor() || hasBrokenRecognition()) return 'device';
  try {
    if (localStorage.getItem(ENGINE_KEY) === 'device') return 'device';
  } catch {
    /* storage blocked */
  }
  return 'browser';
}

function rememberEngine(engine: RecognitionEngine) {
  try {
    localStorage.setItem(ENGINE_KEY, engine);
  } catch {
    /* storage blocked */
  }
}

/** Browser recognition that hasn't started after this long is treated as broken. */
const START_TIMEOUT_MS = 5000;
/**
 * A working service reports sound, a result, or a `no-speech` timeout within a few seconds.
 * Some browsers (e.g. Chromium without Google's service) start and then stay silent forever.
 */
const FEEDBACK_TIMEOUT_MS = 12000;
/** A working service returns words within a second or two of detecting speech. */
const NO_RESULT_TIMEOUT_MS = 8000;
/** Sessions that hear audio but return no words before we switch to the device engine. */
const MAX_NO_MATCH = 2;

const browserErrorMessage = (code: string) =>
  code === 'not-allowed'
    ? 'Microphone access was blocked. Allow it in your browser settings and try again.'
    : code === 'network'
      ? 'Speech recognition needs an internet connection.'
      : code === 'language-not-supported'
        ? 'This browser can’t recognise the selected language. Try another language or browser.'
        : code === 'audio-capture'
          ? 'No microphone was found, or another app is using it.'
          : `Speech recognition stopped unexpectedly (${code}). Please try again.`;

type Driver = { start: () => void; stop: () => void };

/**
 * Continuous speech recognition that works on any device. Uses the browser's own recognition
 * where it works, and falls back to on-device Vosk where it's missing or returns nothing
 * (Firefox, Brave, some Android setups). Accumulates final results into `transcript`.
 */
export function useSpeechRecognition(lang: string) {
  const hasBrowserEngine = useSyncExternalStore(noopSubscribe, () => !!getRecognitionCtor() && !hasBrokenRecognition(), () => true);
  const preferredEngine = useSyncExternalStore(noopSubscribe, defaultEngine, () => 'browser' as const);
  const deviceSupported = useSyncExternalStore(noopSubscribe, canUseVosk, () => true);
  const [chosenEngine, setChosenEngine] = useState<RecognitionEngine | null>(null);
  const engine: RecognitionEngine = !hasBrowserEngine ? 'device' : (chosenEngine ?? preferredEngine);
  const supported = hasBrowserEngine || deviceSupported;
  const canFallBack = deviceSupported && !!voskModelFor(lang);

  const [status, setStatus] = useState<RecognitionStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const driverRef = useRef<Driver | null>(null);
  const wantListeningRef = useRef(false);

  const appendFinal = useCallback((text: string) => {
    setTranscript((prev) => `${prev} ${text}`.trim());
    setInterim('');
  }, []);

  const fail = useCallback((message: string) => {
    wantListeningRef.current = false;
    setStatus('error');
    setError(message);
  }, []);

  /** Switch engines; if listening, the new engine picks up straight away. */
  const switchEngine = useCallback((next: RecognitionEngine) => {
    rememberEngine(next);
    setChosenEngine(next);
  }, []);

  useEffect(() => {
    let driver: Driver;

    if (engine === 'browser') {
      const Ctor = getRecognitionCtor();
      if (!Ctor) return;
      const recognition = new Ctor();
      recognition.continuous = !isAndroid();
      recognition.interimResults = true;
      recognition.lang = lang;

      let gotResult = false;
      let gotFeedback = false;
      let noMatches = 0;
      let startTimer: ReturnType<typeof setTimeout> | undefined;
      let feedbackTimer: ReturnType<typeof setTimeout> | undefined;
      let resultTimer: ReturnType<typeof setTimeout> | undefined;
      const feedback = () => {
        gotFeedback = true;
        clearTimeout(feedbackTimer);
      };
      const clearTimers = () => {
        clearTimeout(startTimer);
        clearTimeout(feedbackTimer);
        clearTimeout(resultTimer);
        feedbackTimer = resultTimer = undefined;
      };
      const fallBack = () => {
        clearTimers();
        recognition.onend = null;
        try {
          recognition.abort();
        } catch {
          /* ignore */
        }
        switchEngine('device');
      };

      recognition.onstart = () => {
        clearTimeout(startTimer);
        setStatus('listening');
        if (!gotFeedback && canFallBack && !feedbackTimer) feedbackTimer = setTimeout(fallBack, FEEDBACK_TIMEOUT_MS);
      };
      recognition.onsoundstart = feedback;
      // Hears speech but never returns words: seen in Chromium builds and some Android setups
      recognition.onspeechstart = () => {
        if (!gotResult && canFallBack && !resultTimer) resultTimer = setTimeout(fallBack, NO_RESULT_TIMEOUT_MS);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        feedback();
        clearTimeout(resultTimer);
        gotResult = true;
        let finalText = '';
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalText += text;
          else interimText += text;
        }
        if (finalText) appendFinal(finalText);
        setInterim(interimText);
      };

      // Heard audio but returned no words: on some Android setups this repeats forever
      recognition.onnomatch = () => {
        feedback();
        if (!gotResult && ++noMatches >= MAX_NO_MATCH && canFallBack) fallBack();
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') return feedback();
        if (event.error === 'aborted') return;
        // The browser's speech service is unreachable or disabled; the device engine doesn't need it
        const serviceBroken = ['network', 'service-not-allowed', 'language-not-supported'].includes(event.error);
        if (serviceBroken && canFallBack) return fallBack();
        fail(browserErrorMessage(event.error === 'service-not-allowed' ? 'not-allowed' : event.error));
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

      driver = {
        start: () => {
          clearTimeout(startTimer);
          if (canFallBack) startTimer = setTimeout(fallBack, START_TIMEOUT_MS);
          try {
            recognition.start();
          } catch {
            // Already started — fine
          }
        },
        stop: () => {
          clearTimers();
          try {
            recognition.stop();
          } catch {
            /* ignore */
          }
        },
      };
      driverRef.current = driver;

      // If the language or engine changed while listening, carry on
      if (wantListeningRef.current) driver.start();

      return () => {
        clearTimers();
        recognition.onend = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onnomatch = null;
        recognition.onsoundstart = null;
        recognition.onspeechstart = null;
        try {
          recognition.abort();
        } catch {
          /* ignore */
        }
        driverRef.current = null;
      };
    }

    let active = true;
    let starting = false;
    let stopVosk: (() => void) | null = null;
    driver = {
      start: () => {
        if (stopVosk || starting) return;
        if (!voskModelFor(lang)) {
          return fail(
            hasBrowserEngine
              ? 'On-device recognition doesn’t support this language. Choose English or French, or switch to browser recognition.'
              : 'Voice input in this language needs Google Chrome or Microsoft Edge. Choose English or French to use it here.'
          );
        }
        setStatus('loading');
        starting = true;
        startVosk(lang, { onReady: () => active && wantListeningRef.current && setStatus('listening'), onPartial: (t) => active && setInterim(t), onFinal: (t) => active && appendFinal(t) })
          .finally(() => (starting = false))
          .then((stop) => {
            if (active && wantListeningRef.current) stopVosk = stop;
            else stop();
          })
          .catch((err) => {
            if (!active) return;
            fail(
              err?.name === 'NotAllowedError'
                ? 'Microphone access was blocked. Allow it in your browser settings and try again.'
                : err?.name === 'NotFoundError'
                  ? 'No microphone was found. Plug one in and try again.'
                  : 'Could not load on-device speech recognition. Check your connection and try again.'
            );
          });
      },
      stop: () => {
        stopVosk?.();
        stopVosk = null;
        setInterim('');
        setStatus((s) => (s === 'error' ? s : 'idle'));
      },
    };
    driverRef.current = driver;

    if (wantListeningRef.current) driver.start();

    return () => {
      active = false;
      stopVosk?.();
      driverRef.current = null;
    };
  }, [lang, engine, canFallBack, hasBrowserEngine, appendFinal, fail, switchEngine]);

  // Stop listening when the component unmounts
  useEffect(
    () => () => {
      wantListeningRef.current = false;
    },
    []
  );

  const start = useCallback(() => {
    if (!driverRef.current) return;
    setError('');
    setStatus('starting');
    wantListeningRef.current = true;
    driverRef.current.start();
  }, []);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    driverRef.current?.stop();
    setStatus('idle');
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterim('');
  }, []);

  return {
    supported,
    engine,
    /** Whether the user can switch between browser and device recognition here. */
    canSwitchEngine: hasBrowserEngine && deviceSupported,
    switchEngine,
    status,
    listening: status === 'listening' || status === 'starting' || status === 'loading',
    transcript,
    interim,
    error,
    start,
    stop,
    reset,
  };
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
