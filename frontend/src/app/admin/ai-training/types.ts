export type TrainingStatus = 'pending' | 'training' | 'completed' | 'failed';

export interface EpochStats {
  epoch: number;
  loss: number;
  accuracy: number;
  valLoss: number;
  valAccuracy: number;
}

export interface ClassMetrics {
  label: string;
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export interface Training {
  _id: string;
  trainingName: string;
  modelVersion: string;
  status: TrainingStatus;
  datasetSize?: number;
  epochs?: number;
  batchSize?: number;
  learningRate?: number;
  hiddenUnits?: number;
  validationSplit?: number;
  autoDeploy?: boolean;
  currentEpoch?: number;
  history?: EpochStats[];
  accuracy?: number;
  valAccuracy?: number;
  loss?: number;
  valLoss?: number;
  bestEpoch?: number;
  labels?: string[];
  skippedLabels?: string[];
  trainingTime?: number;
  errorMessage?: string;
  isActive?: boolean;
  /** False for models trained before "not a trained sign" detection; they are no longer used. */
  noveltyCheck?: boolean;
  deployedAt?: string;
  modelMetrics?: {
    perClass?: ClassMetrics[];
    confusion?: number[][];
    trainCount?: number;
    valCount?: number;
  };
  createdAt: string;
}

export interface DatasetSign {
  label: string;
  count: number;
  lastAddedAt: string;
  /** Separate recording sessions; clips from one session are near-duplicates. */
  recordings: number;
}

export interface Dataset {
  signs: DatasetSign[];
  totalSamples: number;
  trainableSigns: number;
  canTrain: boolean;
  minSamplesPerSign: number;
  recommendedSamplesPerSign: number;
  recommendedRecordingsPerSign: number;
}

export const isRunning = (t: Training) => t.status === 'pending' || t.status === 'training';

export const pct = (v?: number | null, digits = 1) => (v === undefined || v === null ? '—' : `${(v * 100).toFixed(digits)}%`);
