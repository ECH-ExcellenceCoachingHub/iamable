'use client';

import type { Model } from 'vosk-browser';

/**
 * On-device speech recognition with Vosk (WebAssembly), used where the browser's own
 * recognition is missing or broken. Models are served from /public/models by
 * scripts/vosk-models.mjs. Kinyarwanda has no Vosk model.
 */
const VOSK_MODELS: Record<string, { url: string; sizeMb: number }> = {
  en: { url: '/models/vosk-en.tar.gz', sizeMb: 41 },
  fr: { url: '/models/vosk-fr.tar.gz', sizeMb: 42 },
};

export const voskModelFor = (lang: string) => VOSK_MODELS[lang.slice(0, 2)] ?? null;

export const canUseVosk = () =>
  typeof window !== 'undefined' && typeof WebAssembly === 'object' && 'AudioContext' in window && !!navigator.mediaDevices?.getUserMedia;

// One model per language per page load; the browser's HTTP cache keeps the download for next time
const models = new Map<string, Promise<Model>>();

function loadModel(url: string) {
  let model = models.get(url);
  if (!model) {
    model = import('vosk-browser').then(({ createModel }) => createModel(url));
    model.catch(() => models.delete(url));
    models.set(url, model);
  }
  return model;
}

export type VoskHandlers = {
  /** The model is loaded and the mic is open. */
  onReady: () => void;
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
};

/** Starts listening; resolves with a function that stops it. Rejects if the mic or model fails. */
export async function startVosk(lang: string, handlers: VoskHandlers): Promise<() => void> {
  const entry = voskModelFor(lang);
  if (!entry) throw new Error('unsupported-language');

  // Ask for the mic while the model downloads
  const [stream, model] = await Promise.all([
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } }),
    loadModel(entry.url),
  ]);

  const ctx = new AudioContext();
  const recognizer = new model.KaldiRecognizer(ctx.sampleRate);
  recognizer.on('result', (msg) => {
    const text = 'result' in msg && 'text' in msg.result ? msg.result.text.trim() : '';
    if (text) handlers.onFinal(text);
  });
  recognizer.on('partialresult', (msg) => {
    if ('result' in msg && 'partial' in msg.result) handlers.onPartial(msg.result.partial);
  });

  const source = ctx.createMediaStreamSource(stream);
  // ScriptProcessor is deprecated but, unlike AudioWorklet, needs no separate module file
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  processor.onaudioprocess = (e) => recognizer.acceptWaveform(e.inputBuffer);
  source.connect(processor);
  processor.connect(ctx.destination);
  handlers.onReady();

  return () => {
    processor.onaudioprocess = null;
    processor.disconnect();
    source.disconnect();
    stream.getTracks().forEach((t) => t.stop());
    ctx.close();
    // Flush the last phrase, then free the recognizer once the worker has answered
    recognizer.retrieveFinalResult();
    setTimeout(() => recognizer.remove(), 1000);
  };
}
