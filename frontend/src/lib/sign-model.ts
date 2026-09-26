'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { BODY_FEATURE_SIZE, FEATURE_VERSION } from '@/lib/body-features';

/**
 * Label for "not signing" samples. Training on it teaches the model what idle hands look like,
 * so it doesn't force every movement into a sign. It is never shown as a recognised sign.
 */
export const REST_LABEL = 'no sign (resting)';

/**
 * A sign classifier trained on the admin AI Training page (see backend/src/ai/trainer.ts).
 * Input is a whole-body motion clip from body-features.ts (BODY_FEATURE_SIZE numbers).
 */
export interface SignModel {
  id: string;
  modelVersion: string;
  trainingName?: string;
  valAccuracy?: number;
  labels: string[];
  mean: number[];
  std: number[];
  w1: number[];
  b1: number[];
  w2: number[];
  b2: number[];
  hiddenUnits: number;
  featureVersion?: string;
  /** Per-sign centre of the normalised training clips, classes x features row-major. */
  centroids: number[];
  /** Typical distance of a sign's clips from its centre. */
  radii: number[];
  /** A clip further than radius x margin from its predicted sign is something never taught. */
  noveltyMargin: number;
}

/** Whether the model was trained on the features this app produces. */
export function isCompatibleModel(model: SignModel | null | undefined): model is SignModel {
  return (
    !!model &&
    model.featureVersion === FEATURE_VERSION &&
    model.mean?.length === BODY_FEATURE_SIZE &&
    // Models trained before the novelty check can't tell "unknown" apart and must be retrained
    model.centroids?.length === model.labels.length * BODY_FEATURE_SIZE &&
    model.radii?.length === model.labels.length
  );
}

export interface SignPrediction {
  label: string;
  probability: number;
}

export interface SignResult {
  /** Class probabilities, highest first. */
  predictions: SignPrediction[];
  /** The most likely sign, or null when the clip looks like nothing the model was taught. */
  sign: SignPrediction | null;
  /** How far the clip is from the top sign, relative to what's normal for it (1 = typical). */
  novelty: number;
}

/**
 * Classifies a clip and checks it actually resembles the predicted sign. The network alone
 * always picks one of its signs, however unlike them the movement is.
 */
export function classifySign(model: SignModel, vector: number[]): SignResult {
  const x = normalise(model, vector);
  const predictions = predictNormalised(model, x);
  const top = predictions[0];
  const k = model.labels.indexOf(top.label);
  const D = x.length;
  let sum = 0;
  for (let i = 0; i < D; i++) sum += (x[i] - model.centroids[k * D + i]) ** 2;
  const novelty = Math.sqrt(sum / D) / (model.radii[k] || 1e-3);
  return { predictions, sign: novelty <= model.noveltyMargin ? top : null, novelty };
}

function normalise(model: SignModel, vector: number[]) {
  const { mean, std } = model;
  const x = new Float64Array(mean.length);
  for (let i = 0; i < mean.length; i++) x[i] = (vector[i] - mean[i]) / (std[i] || 1);
  return x;
}

/** Class probabilities, highest first. */
export function predictSign(model: SignModel, vector: number[]): SignPrediction[] {
  return predictNormalised(model, normalise(model, vector));
}

function predictNormalised(model: SignModel, x: Float64Array): SignPrediction[] {
  const { w1, b1, w2, b2, hiddenUnits: H, labels } = model;
  const D = x.length;

  const h = new Float64Array(H);
  for (let j = 0; j < H; j++) {
    let s = b1[j];
    const row = j * D;
    for (let i = 0; i < D; i++) s += w1[row + i] * x[i];
    h[j] = s > 0 ? s : 0;
  }

  const logits = labels.map((_, k) => {
    let s = b2[k];
    const row = k * H;
    for (let j = 0; j < H; j++) s += w2[row + j] * h[j];
    return s;
  });
  const max = Math.max(...logits);
  const exps = logits.map((z) => Math.exp(z - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return labels.map((label, k) => ({ label, probability: exps[k] / sum })).sort((a, b) => b.probability - a.probability);
}

let cached: { model: SignModel | null; at: number } | null = null;
let inflight: Promise<SignModel | null> | null = null;
const CACHE_MS = 60_000;

/** Fetches the deployed model once a minute at most; resolves null when none is deployed. */
export function loadActiveSignModel(force = false): Promise<SignModel | null> {
  if (!force && cached && Date.now() - cached.at < CACHE_MS) return Promise.resolve(cached.model);
  inflight ??= api.ai
    .getActiveModel()
    .then((model) => {
      const m = isCompatibleModel(model) ? model : null;
      cached = { model: m, at: Date.now() };
      return m;
    })
    .catch(() => cached?.model ?? null)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** The deployed custom sign model, or null while loading / when none is deployed. */
export function useActiveSignModel() {
  const [model, setModel] = useState<SignModel | null>(cached?.model ?? null);
  useEffect(() => {
    let active = true;
    loadActiveSignModel().then((m) => active && setModel(m));
    return () => {
      active = false;
    };
  }, []);
  return model;
}
