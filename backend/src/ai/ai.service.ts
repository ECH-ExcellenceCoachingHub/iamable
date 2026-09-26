import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AILog, AILogDocument } from './schemas/ai-log.schema';
import { AITraining, AITrainingDocument } from './schemas/ai-training.schema';
import {
  TrainingSample,
  TrainingSampleDocument,
} from './schemas/training-sample.schema';
import { CreateTrainingDto } from './dto/create-training.dto';
import { AddSamplesDto } from './dto/add-samples.dto';
import { LogPredictionDto } from './dto/log-prediction.dto';
import { trainSignModel } from './trainer';

/**
 * Sample format produced by the frontend's body-features.ts: 8 frames x 170 numbers of
 * upper-body pose + both hands. Must match BODY_FEATURE_SIZE / FEATURE_VERSION there.
 */
export const FEATURE_VERSION = 'body-v1';
export const FEATURE_SIZE = 1360;

/** A sign needs at least this many samples to be included in training. */
export const MIN_SAMPLES_PER_SIGN = 10;
/** Samples per sign at which the dataset is considered well covered. */
export const RECOMMENDED_SAMPLES_PER_SIGN = 100;
/** Separate recordings per sign needed to measure accuracy on genuinely new takes. */
export const RECOMMENDED_RECORDINGS_PER_SIGN = 2;

// ─── Hand landmark indices (MediaPipe Hands) ────────────────────────────────
// 0: wrist
// 1-4: thumb  (CMC, MCP, IP, TIP)
// 5-8: index  (MCP, PIP, DIP, TIP)
// 9-12: middle (MCP, PIP, DIP, TIP)
// 13-16: ring  (MCP, PIP, DIP, TIP)
// 17-20: pinky (MCP, PIP, DIP, TIP)

interface Landmark {
  x: number;
  y: number;
  z: number;
}

interface HandFeatures {
  // finger extension states
  thumbUp: boolean;
  thumbDown: boolean;
  thumbOut: boolean; // thumb pointing sideways away from palm
  indexUp: boolean;
  middleUp: boolean;
  ringUp: boolean;
  pinkyUp: boolean;
  extCount: number; // total extended fingers (not thumb)
  extCountWithThumb: number;

  // curl ratios (1.0 = fully extended, 0 = fully curled)
  indexCurl: number;
  middleCurl: number;
  ringCurl: number;
  pinkyCurl: number;

  // key distances (normalised by hand size)
  thumbIndexDist: number;
  thumbMiddleDist: number;
  thumbPinkyDist: number;
  indexMiddleDist: number;
  middleRingDist: number;
  ringPinkyDist: number;

  // wrist position in frame (0–1)
  wx: number;
  wy: number;

  // palm normal direction (z-component of cross product of two edge vectors)
  palmFacingCamera: boolean; // true = palm towards camera, false = back of hand

  handSize: number; // wrist-to-middle-MCP distance
}

function dist(a: Landmark, b: Landmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function extractFeatures(lm: Landmark[]): HandFeatures {
  const wrist = lm[0];
  // thumb
  const tMCP = lm[1],
    tIP = lm[2],
    tPIP = lm[3],
    tTip = lm[4];
  // index
  const iMCP = lm[5],
    iPIP = lm[6],
    iDIP = lm[7],
    iTip = lm[8];
  // middle
  const mMCP = lm[9],
    mPIP = lm[10],
    mDIP = lm[11],
    mTip = lm[12];
  // ring
  const rMCP = lm[13],
    rPIP = lm[14],
    rDIP = lm[15],
    rTip = lm[16];
  // pinky
  const pMCP = lm[17],
    pPIP = lm[18],
    pDIP = lm[19],
    pTip = lm[20];

  const handSize = dist(wrist, mMCP) || 0.001;

  // Extension: tip farther from MCP than pip is from MCP (ratio > 1.3)
  const fExt = (tip: Landmark, pip: Landmark, mcp: Landmark) =>
    dist(tip, mcp) / (dist(pip, mcp) + 0.001) > 1.3;

  // Curl ratio: tip-to-mcp / pip-to-mcp  (higher = more extended)
  const curlRatio = (tip: Landmark, pip: Landmark, mcp: Landmark) =>
    Math.min(dist(tip, mcp) / (dist(pip, mcp) + 0.001), 2.5);

  const indexUp = fExt(iTip, iPIP, iMCP);
  const middleUp = fExt(mTip, mPIP, mMCP);
  const ringUp = fExt(rTip, rPIP, rMCP);
  const pinkyUp = fExt(pTip, pPIP, pMCP);
  const extCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;

  // Thumb: compare tip position to knuckle (x-axis for horizontal extension)
  const thumbOut = dist(tTip, iMCP) > handSize * 1.2;
  const thumbUp = thumbOut && tTip.y < tPIP.y;
  const thumbDown = thumbOut && tTip.y > tPIP.y;
  const extCountWithThumb = extCount + (thumbOut ? 1 : 0);

  // Palm facing camera: z of tips < z of MCPs means facing towards camera
  const avgTipZ = (iTip.z + mTip.z + rTip.z + pTip.z) / 4;
  const avgMcpZ = (iMCP.z + mMCP.z + rMCP.z + pMCP.z) / 4;
  const palmFacingCamera = avgTipZ < avgMcpZ;

  const nd = (a: Landmark, b: Landmark) => dist(a, b) / handSize;

  return {
    thumbUp,
    thumbDown,
    thumbOut,
    indexUp,
    middleUp,
    ringUp,
    pinkyUp,
    extCount,
    extCountWithThumb,
    indexCurl: curlRatio(iTip, iPIP, iMCP),
    middleCurl: curlRatio(mTip, mPIP, mMCP),
    ringCurl: curlRatio(rTip, rPIP, rMCP),
    pinkyCurl: curlRatio(pTip, pPIP, pMCP),
    thumbIndexDist: nd(tTip, iTip),
    thumbMiddleDist: nd(tTip, mTip),
    thumbPinkyDist: nd(tTip, pTip),
    indexMiddleDist: nd(iTip, mTip),
    middleRingDist: nd(mTip, rTip),
    ringPinkyDist: nd(rTip, pTip),
    wx: wrist.x,
    wy: wrist.y,
    palmFacingCamera,
    handSize,
  };
}

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @InjectModel(AILog.name) private aiLogModel: Model<AILogDocument>,
    @InjectModel(AITraining.name)
    private aiTrainingModel: Model<AITrainingDocument>,
    @InjectModel(TrainingSample.name)
    private sampleModel: Model<TrainingSampleDocument>,
  ) {}

  /** Training runs in this process, so a restart interrupts any run that was in progress. */
  async onModuleInit() {
    await this.aiTrainingModel.updateMany(
      { status: { $in: ['pending', 'training'] } },
      {
        status: 'failed',
        errorMessage:
          'The server restarted before training finished. Start a new run.',
        finishedAt: new Date(),
      },
    );
  }

  // ─── Prediction logs & monitoring ───────────────────────────────────────

  async logPrediction(logData: Partial<AILog>) {
    return this.aiLogModel.create({ modelVersion: 'rules-v1', ...logData });
  }

  /** Called by the browser when it recognises a sign (Sign to Text) or answers a knowledge check. */
  async recordPrediction(dto: LogPredictionDto, userId?: string) {
    const expected = dto.expected?.trim();
    return this.logPrediction({
      gestureRecognized: dto.gesture,
      confidence: dto.confidence,
      processingTime: dto.processingTime,
      modelVersion: dto.modelVersion || 'built-in',
      source: dto.source ?? 'sign-to-text',
      ...(expected ? { expected, correct: expected === dto.gesture } : {}),
      ...(userId ? { userId: new Types.ObjectId(userId) } : {}),
    });
  }

  async getLogs(limit: number = 100, source?: string) {
    const filter = source ? { source } : {};
    return this.aiLogModel
      .find(filter)
      .select('-predictionData')
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 100, 500));
  }

  async getStats() {
    const [totals, gestureDistribution, perSign, bySource, activeModel] =
      await Promise.all([
        this.aiLogModel.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              avgConfidence: { $avg: '$confidence' },
              avgTime: { $avg: '$processingTime' },
              verified: {
                $sum: {
                  $cond: [{ $eq: [{ $type: '$correct' }, 'bool'] }, 1, 0],
                },
              },
              correct: { $sum: { $cond: [{ $eq: ['$correct', true] }, 1, 0] } },
            },
          },
        ]),
        this.aiLogModel.aggregate([
          { $group: { _id: '$gestureRecognized', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        // Accuracy per sign, from answers where the real sign is known
        this.aiLogModel.aggregate([
          { $match: { correct: { $type: 'bool' } } },
          {
            $group: {
              _id: '$expected',
              total: { $sum: 1 },
              correct: { $sum: { $cond: ['$correct', 1, 0] } },
            },
          },
          {
            $project: {
              total: 1,
              correct: 1,
              accuracy: { $divide: ['$correct', '$total'] },
            },
          },
          { $sort: { accuracy: 1, total: -1 } },
        ]),
        this.aiLogModel.aggregate([
          { $group: { _id: '$source', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        this.getActiveModelSummary(),
      ]);

    const t = totals[0];
    return {
      totalPredictions: t?.total ?? 0,
      avgConfidence: t?.avgConfidence ?? 0,
      avgProcessingTime: t?.avgTime ?? 0,
      verifiedPredictions: t?.verified ?? 0,
      /** Share of knowledge-check answers that were right; null until there are any. */
      verifiedAccuracy: t?.verified ? t.correct / t.verified : null,
      gestureDistribution,
      perSignAccuracy: perSign,
      bySource,
      activeModel,
    };
  }

  /** Runs the legacy rule engine on raw landmarks sent to /ai/predict. */
  async processGesture(gestureData: any) {
    const startTime = Date.now();
    const landmarks = gestureData?.landmarks;
    if (!Array.isArray(landmarks) || landmarks.length < 21) {
      throw new BadRequestException(
        'gestureData.landmarks must contain the 21 MediaPipe hand landmarks.',
      );
    }

    const { gesture, confidence } = this.classifyGesture(landmarks);
    const processingTime = Date.now() - startTime;
    await this.logPrediction({
      predictionData: gestureData,
      gestureRecognized: gesture,
      confidence,
      processingTime,
      source: 'api',
    });
    return { gesture, confidence, processingTime };
  }

  // ─── Comprehensive sign recognition engine ───────────────────────────────
  // Each entry: { match: (f) => boolean, label: string, conf: number }
  // Evaluated in priority order – first match wins.
  // Labels are in Kinyarwanda where applicable, otherwise English.
  // ─────────────────────────────────────────────────────────────────────────
  private classifyGesture(landmarks: any[]): {
    gesture: string;
    confidence: number;
  } {
    const f = extractFeatures(landmarks as Landmark[]);
    const {
      thumbUp,
      thumbDown,
      thumbOut,
      indexUp,
      middleUp,
      ringUp,
      pinkyUp,
      extCount,
      extCountWithThumb,
      indexCurl,
      middleCurl,
      ringCurl,
      pinkyCurl,
      thumbIndexDist,
      thumbMiddleDist,
      thumbPinkyDist,
      indexMiddleDist,
      middleRingDist,
      ringPinkyDist,
      wx,
      wy,
      palmFacingCamera,
    } = f;

    // ── helpers ──────────────────────────────────────────────────────────
    const fist = extCount === 0 && !thumbOut;
    const openPalm = extCount === 4 && thumbOut;
    const only = (i: boolean, m: boolean, r: boolean, p: boolean, t: boolean) =>
      indexUp === i &&
      middleUp === m &&
      ringUp === r &&
      pinkyUp === p &&
      thumbOut === t;

    type Rule = { test: () => boolean; label: string; conf: number };
    const rules: Rule[] = [
      // ════════════════════════════════════════════════════════════════════
      // CORE GREETINGS  (Amashyaka yo gusanganira)
      // ════════════════════════════════════════════════════════════════════
      {
        test: () => openPalm && palmFacingCamera && wy < 0.5,
        label: 'muraho (hello)',
        conf: 0.9,
      },
      {
        test: () => openPalm && !palmFacingCamera && wy < 0.5,
        label: 'amakuru (how are you)',
        conf: 0.85,
      },
      {
        test: () => fist && wy < 0.45 && wx > 0.3 && wx < 0.7,
        label: 'mwiriwe (good evening)',
        conf: 0.78,
      },
      {
        test: () =>
          extCount === 2 && indexUp && middleUp && palmFacingCamera && wy < 0.4,
        label: 'urakoze (thank you)',
        conf: 0.87,
      },
      {
        test: () =>
          extCount === 3 && indexUp && middleUp && ringUp && palmFacingCamera,
        label: 'murabeho (goodbye)',
        conf: 0.82,
      },
      {
        test: () => openPalm && wy < 0.35,
        label: 'bwiriwe (evening)',
        conf: 0.72,
      },
      {
        test: () => thumbUp && extCount === 0,
        label: 'byiza (good)',
        conf: 0.9,
      },
      {
        test: () => thumbDown && extCount === 0,
        label: 'bibi (bad)',
        conf: 0.88,
      },

      // ════════════════════════════════════════════════════════════════════
      // AFFIRMATIONS / NEGATIONS
      // ════════════════════════════════════════════════════════════════════
      {
        test: () => only(true, false, false, false, false) && wy < 0.5,
        label: 'yego (yes)',
        conf: 0.88,
      },
      { test: () => fist && !thumbOut, label: 'oya (no)', conf: 0.9 },
      {
        test: () =>
          only(true, false, false, false, true) && thumbIndexDist > 1.2,
        label: 'kumva (understand)',
        conf: 0.8,
      },
      {
        test: () => openPalm && wy > 0.6,
        label: 'tangira (stop/start)',
        conf: 0.75,
      },

      // ════════════════════════════════════════════════════════════════════
      // NUMBERS  (Imibare)
      // ════════════════════════════════════════════════════════════════════
      {
        test: () => only(true, false, false, false, false),
        label: 'rimwe (one)',
        conf: 0.9,
      },
      {
        test: () =>
          only(true, true, false, false, false) && indexMiddleDist < 0.6,
        label: 'kabiri (two)',
        conf: 0.88,
      },
      {
        test: () => only(true, true, true, false, false),
        label: 'gatatu (three)',
        conf: 0.86,
      },
      {
        test: () => extCount === 4 && !thumbOut,
        label: 'kane (four)',
        conf: 0.85,
      },
      {
        test: () => openPalm && indexMiddleDist > 0.5 && middleRingDist > 0.5,
        label: 'gatanu (five)',
        conf: 0.85,
      },
      {
        test: () =>
          thumbOut && !indexUp && !middleUp && !ringUp && !pinkyUp && wy < 0.5,
        label: 'gatandatu (six)',
        conf: 0.8,
      },
      {
        test: () => only(false, false, false, false, true) && thumbOut,
        label: 'karindwi (seven)',
        conf: 0.8,
      },
      {
        test: () => only(false, true, true, true, false) && !thumbOut,
        label: 'umunani (eight)',
        conf: 0.78,
      },
      {
        test: () => only(true, true, true, true, false) && !thumbOut,
        label: 'icyenda (nine)',
        conf: 0.78,
      },
      {
        test: () => thumbIndexDist < 0.5 && extCount === 0,
        label: 'icumi (ten)',
        conf: 0.82,
      },
      {
        test: () =>
          thumbIndexDist < 0.5 && only(false, true, false, false, false),
        label: 'cumi na rimwe (eleven)',
        conf: 0.76,
      },
      {
        test: () =>
          thumbIndexDist < 0.5 && only(false, true, true, false, false),
        label: 'cumi na kabiri (twelve)',
        conf: 0.75,
      },

      // ════════════════════════════════════════════════════════════════════
      // PEOPLE / FAMILY  (Abantu / Umuryango)
      // ════════════════════════════════════════════════════════════════════
      {
        test: () => only(true, false, false, true, false) && wy < 0.5,
        label: 'umuryango (family)',
        conf: 0.82,
      },
      {
        test: () => openPalm && wx > 0.55 && wy < 0.5,
        label: 'inshuti (friend)',
        conf: 0.78,
      },
      {
        test: () =>
          only(true, true, false, false, false) && indexMiddleDist > 0.7,
        label: 'umukunzi (lover)',
        conf: 0.78,
      },
      {
        test: () =>
          only(false, false, false, false, true) && thumbPinkyDist < 0.5,
        label: 'data (father)',
        conf: 0.76,
      },
      {
        test: () => openPalm && wy > 0.55 && wx > 0.3 && wx < 0.7,
        label: 'mama (mother)',
        conf: 0.76,
      },
      {
        test: () => only(true, false, false, false, false) && wy < 0.3,
        label: 'umuhungu (son)',
        conf: 0.74,
      },
      {
        test: () => only(false, true, false, false, false) && wy < 0.3,
        label: 'umukobwa (daughter)',
        conf: 0.74,
      },
      {
        test: () =>
          extCount === 3 && ringUp && middleUp && indexUp && wy < 0.35,
        label: 'umwana (child)',
        conf: 0.75,
      },
      {
        test: () => fist && wx > 0.6 && wy > 0.35,
        label: 'mucye (brother/sister)',
        conf: 0.7,
      },

      // ════════════════════════════════════════════════════════════════════
      // EMOTIONS  (Ibyiyumvo)
      // ════════════════════════════════════════════════════════════════════
      {
        test: () =>
          openPalm && palmFacingCamera && wy > 0.5 && wx > 0.3 && wx < 0.7,
        label: 'ishimwe (happy)',
        conf: 0.8,
      },
      { test: () => fist && wy > 0.55, label: 'agahinda (sad)', conf: 0.78 },
      {
        test: () => extCount === 1 && indexUp && wy < 0.4 && wx < 0.4,
        label: 'uburakari (angry)',
        conf: 0.75,
      },
      {
        test: () => extCount === 0 && thumbOut && wy < 0.35,
        label: 'gutinya (fear)',
        conf: 0.74,
      },
      {
        test: () => only(true, true, true, false, false) && wy > 0.5,
        label: 'kunezezwa (joy)',
        conf: 0.74,
      },
      {
        test: () => thumbOut && extCount === 4 && wy > 0.55,
        label: 'gutuza (calm)',
        conf: 0.72,
      },
      {
        test: () => fist && wx > 0.3 && wx < 0.7 && wy < 0.4,
        label: 'gutinda (tired)',
        conf: 0.72,
      },
      {
        test: () => openPalm && wy > 0.6 && palmFacingCamera,
        label: 'kunyura (satisfied)',
        conf: 0.7,
      },

      // ════════════════════════════════════════════════════════════════════
      // BASIC ACTIONS  (Ibikorwa)
      // ════════════════════════════════════════════════════════════════════
      {
        test: () => extCount === 2 && indexUp && middleUp && wy > 0.55,
        label: 'gufata (take)',
        conf: 0.78,
      },
      {
        test: () => thumbOut && extCount === 4 && palmFacingCamera && wy < 0.45,
        label: 'gutanga (give)',
        conf: 0.78,
      },
      {
        test: () => extCount === 1 && indexUp && wx > 0.6,
        label: 'kugaruka (come here)',
        conf: 0.78,
      },
      {
        test: () => openPalm && !palmFacingCamera && wy > 0.4 && wx < 0.3,
        label: 'genda (go)',
        conf: 0.76,
      },
      {
        test: () => extCount === 2 && indexUp && middleUp && wy > 0.6,
        label: 'kugenda (walk)',
        conf: 0.75,
      },
      {
        test: () => extCount === 2 && indexUp && middleUp && wy < 0.4,
        label: 'gutura (run)',
        conf: 0.74,
      },
      {
        test: () => openPalm && wy < 0.35 && wx > 0.3 && wx < 0.7,
        label: 'kubyuka (stand up)',
        conf: 0.75,
      },
      { test: () => openPalm && wy > 0.65, label: 'kwicara (sit)', conf: 0.75 },
      {
        test: () => only(true, false, false, false, false) && wy < 0.3,
        label: 'kujya hejuru (up)',
        conf: 0.76,
      },
      {
        test: () => thumbDown && extCount === 0 && wy > 0.55,
        label: 'kujya hasi (down)',
        conf: 0.76,
      },
      {
        test: () => fist && wy < 0.45 && wx < 0.25,
        label: 'gusunika (push)',
        conf: 0.73,
      },
      {
        test: () => fist && wy < 0.45 && wx > 0.75,
        label: 'gukurura (pull)',
        conf: 0.73,
      },
      {
        test: () =>
          extCount === 3 && indexUp && middleUp && ringUp && wy < 0.45,
        label: 'gutega amatwi (listen)',
        conf: 0.74,
      },
      {
        test: () =>
          extCount === 2 && indexUp && middleUp && thumbOut && wy < 0.35,
        label: 'kureba (look)',
        conf: 0.74,
      },
      {
        test: () =>
          only(false, false, false, false, true) &&
          thumbOut &&
          wy < 0.45 &&
          wx > 0.6,
        label: 'gutumanahana (phone)',
        conf: 0.8,
      },
      {
        test: () =>
          openPalm && !palmFacingCamera && wy < 0.4 && wx > 0.3 && wx < 0.7,
        label: 'kwandika (write)',
        conf: 0.74,
      },
      {
        test: () =>
          extCount === 3 && middleUp && ringUp && pinkyUp && wy < 0.45,
        label: 'gusoma (read)',
        conf: 0.74,
      },
      {
        test: () =>
          extCount === 0 && thumbOut && wy > 0.5 && wx > 0.3 && wx < 0.7,
        label: 'kuryama (sleep)',
        conf: 0.75,
      },
      {
        test: () => extCount >= 3 && wy < 0.4 && wx > 0.4 && wx < 0.6,
        label: 'kurya (eat)',
        conf: 0.74,
      },
      {
        test: () => fist && wy < 0.4 && wx > 0.4 && wx < 0.6,
        label: 'kunywa (drink)',
        conf: 0.75,
      },
      {
        test: () => extCount === 1 && indexUp && !middleUp && wy < 0.35,
        label: 'gusabira (pray)',
        conf: 0.72,
      },
      {
        test: () => extCount === 0 && !thumbOut && wy > 0.5 && wx < 0.35,
        label: 'kubabara (suffer)',
        conf: 0.7,
      },

      // ════════════════════════════════════════════════════════════════════
      // PLACES / THINGS  (Ibibanza / Ibintu)
      // ════════════════════════════════════════════════════════════════════
      {
        test: () =>
          extCount === 2 &&
          indexUp &&
          middleUp &&
          indexMiddleDist > 0.65 &&
          wy < 0.45,
        label: 'inzu (home)',
        conf: 0.8,
      },
      {
        test: () =>
          extCount === 4 && !thumbOut && wy > 0.5 && wx > 0.4 && wx < 0.6,
        label: 'ishuri (school)',
        conf: 0.76,
      },
      {
        test: () => openPalm && wy > 0.5 && wx > 0.4 && wx < 0.6,
        label: 'isoko (market)',
        conf: 0.74,
      },
      {
        test: () => fist && wy > 0.45 && wx > 0.25 && wx < 0.35,
        label: 'imodoka (car)',
        conf: 0.74,
      },
      {
        test: () => extCount === 4 && !thumbOut && wy > 0.4 && wx < 0.3,
        label: 'bisi (bus)',
        conf: 0.72,
      },
      {
        test: () =>
          extCount === 2 && indexUp && middleUp && indexMiddleDist < 0.4,
        label: "inzira y'ishyiga (train)",
        conf: 0.74,
      },
      {
        test: () =>
          extCount === 4 && thumbOut && wy < 0.3 && wx > 0.2 && wx < 0.8,
        label: 'indege (airplane)',
        conf: 0.74,
      },
      {
        test: () =>
          extCount === 3 &&
          indexUp &&
          middleUp &&
          ringUp &&
          wy > 0.55 &&
          wx > 0.4 &&
          wx < 0.6,
        label: 'ibitaro (hospital)',
        conf: 0.74,
      },
      {
        test: () =>
          extCount === 1 && middleUp && wy > 0.5 && wx > 0.4 && wx < 0.6,
        label: 'iduka (shop)',
        conf: 0.72,
      },
      {
        test: () => extCount === 3 && wy > 0.55,
        label: 'urugo (village)',
        conf: 0.7,
      },
      {
        test: () => extCount === 2 && indexUp && pinkyUp && !middleUp,
        label: 'amafaranga (money)',
        conf: 0.76,
      },
      {
        test: () =>
          thumbIndexDist < 0.6 && thumbIndexDist > 0.3 && extCount === 0,
        label: 'amafaranga (money)',
        conf: 0.74,
      },

      // ════════════════════════════════════════════════════════════════════
      // HEALTH  (Ubuzima)
      // ════════════════════════════════════════════════════════════════════
      {
        test: () => extCount >= 3 && wy > 0.5 && wx > 0.35 && wx < 0.65,
        label: 'umuganga (doctor)',
        conf: 0.72,
      },
      {
        test: () => extCount <= 1 && wy < 0.4 && wx > 0.4 && wx < 0.6,
        label: 'imiti (medicine)',
        conf: 0.72,
      },
      {
        test: () =>
          extCount >= 2 && wy > 0.4 && wx > 0.3 && wx < 0.7 && wy < 0.6,
        label: 'kubabara (pain)',
        conf: 0.7,
      },
      {
        test: () => thumbUp && extCount === 0 && wy < 0.4,
        label: 'gukira (get better)',
        conf: 0.86,
      },
      {
        test: () => thumbDown && extCount === 0 && wy > 0.5,
        label: 'kurwara (sick/worse)',
        conf: 0.84,
      },
      {
        test: () => fist && wy > 0.5 && wx > 0.4 && wx < 0.6,
        label: 'gutuza (calm down)',
        conf: 0.72,
      },
      {
        test: () => extCount >= 2 && wy < 0.35 && wx > 0.4 && wx < 0.6,
        label: 'kumara ibyago (help emergency)',
        conf: 0.74,
      },

      // ════════════════════════════════════════════════════════════════════
      // FOOD / DRINK  (Ibiryo)
      // ════════════════════════════════════════════════════════════════════
      {
        test: () =>
          fist && wy < 0.45 && wx > 0.4 && wx < 0.6 && palmFacingCamera,
        label: 'amazi (water)',
        conf: 0.76,
      },
      {
        test: () => extCount === 2 && indexUp && thumbOut && wy < 0.45,
        label: 'inzoga (drink/beverage)',
        conf: 0.73,
      },
      {
        test: () => extCount >= 3 && wy < 0.45 && wx > 0.4 && wx < 0.6,
        label: 'ibiribwa (food)',
        conf: 0.73,
      },
      {
        test: () => fist && wy > 0.5 && wx > 0.4 && wx < 0.6,
        label: 'inzara (hunger)',
        conf: 0.74,
      },
      {
        test: () => extCount <= 1 && wy < 0.45 && wx > 0.4 && wx < 0.6,
        label: 'inyota (thirst)',
        conf: 0.73,
      },
      {
        test: () => extCount === 3 && wy > 0.55,
        label: 'amabere (milk)',
        conf: 0.7,
      },
      {
        test: () => fist && wy < 0.35 && wx > 0.4 && wx < 0.6,
        label: 'kawayi (coffee)',
        conf: 0.7,
      },

      // ════════════════════════════════════════════════════════════════════
      // WEATHER / ENVIRONMENT  (Ikirere)
      // ════════════════════════════════════════════════════════════════════
      {
        test: () => extCount <= 2 && wy > 0.5 && wx < 0.3,
        label: 'ukonje (cold)',
        conf: 0.72,
      },
      {
        test: () => extCount >= 3 && wy < 0.3 && wx > 0.3 && wx < 0.7,
        label: 'ubushyuhe (hot)',
        conf: 0.72,
      },
      {
        test: () => openPalm && wy < 0.4 && wx > 0.1 && wx < 0.5,
        label: 'imvura (rain)',
        conf: 0.7,
      },
      {
        test: () => openPalm && wy < 0.3 && wx > 0.5,
        label: 'izuba (sun)',
        conf: 0.7,
      },

      // ════════════════════════════════════════════════════════════════════
      // TIME  (Igihe)
      // ════════════════════════════════════════════════════════════════════
      {
        test: () =>
          extCount === 2 && indexUp && middleUp && wy > 0.6 && wx < 0.3,
        label: 'igihe (time)',
        conf: 0.72,
      },
      {
        test: () => only(true, false, false, false, false) && wy > 0.55,
        label: 'ubu (now)',
        conf: 0.74,
      },
      {
        test: () => extCount === 2 && indexUp && thumbOut && wy > 0.5,
        label: 'ejo (tomorrow/yesterday)',
        conf: 0.73,
      },
      {
        test: () => extCount === 3 && indexUp && middleUp && ringUp && wy > 0.5,
        label: 'icyumweru (week)',
        conf: 0.72,
      },
      {
        test: () => extCount === 4 && thumbOut && wy > 0.5,
        label: 'ukwezi (month)',
        conf: 0.72,
      },
      {
        test: () => openPalm && wy > 0.5 && wx < 0.25,
        label: 'umwaka (year)',
        conf: 0.7,
      },

      // ════════════════════════════════════════════════════════════════════
      // COMMUNICATION  (Itumanaho)
      // ════════════════════════════════════════════════════════════════════
      {
        test: () =>
          only(false, false, false, false, true) && thumbOut && wx > 0.6,
        label: 'telefoni (phone)',
        conf: 0.82,
      },
      {
        test: () => extCount === 2 && indexUp && middleUp && wy > 0.5,
        label: 'imeyili (email)',
        conf: 0.74,
      },
      {
        test: () => openPalm && wy > 0.4 && wx > 0.2 && wx < 0.8,
        label: 'interineti (internet)',
        conf: 0.72,
      },
      {
        test: () => extCount === 3 && middleUp && ringUp && indexUp && wy > 0.5,
        label: 'mudasobwa (computer)',
        conf: 0.74,
      },
      {
        test: () => extCount === 1 && indexUp && wy < 0.4 && !thumbOut,
        label: 'gutuza (quiet/silence)',
        conf: 0.76,
      },
      {
        test: () =>
          extCount >= 3 &&
          wy < 0.45 &&
          wx > 0.35 &&
          wx < 0.65 &&
          !palmFacingCamera,
        label: 'kwandika (write)',
        conf: 0.72,
      },

      // ════════════════════════════════════════════════════════════════════
      // COLOURS  (Amabara)
      // ════════════════════════════════════════════════════════════════════
      {
        test: () =>
          only(true, false, false, false, true) && thumbIndexDist > 1.0,
        label: 'umutuku (red)',
        conf: 0.74,
      },
      {
        test: () =>
          only(false, true, true, false, false) && middleRingDist < 0.4,
        label: 'icyatsi (green)',
        conf: 0.72,
      },
      {
        test: () => only(false, false, true, false, false),
        label: 'ubururu (blue)',
        conf: 0.72,
      },
      {
        test: () => only(false, true, false, true, false),
        label: 'umuhondo (yellow)',
        conf: 0.72,
      },
      {
        test: () => fist && thumbOut && thumbUp && wy > 0.35,
        label: 'uturabyo (white)',
        conf: 0.7,
      },
      { test: () => fist && !thumbOut, label: 'umukara (black)', conf: 0.68 },

      // ════════════════════════════════════════════════════════════════════
      // DIRECTIONS  (Inzira)
      // ════════════════════════════════════════════════════════════════════
      {
        test: () => only(true, false, false, false, false) && wx < 0.35,
        label: 'ibumoso (left)',
        conf: 0.8,
      },
      {
        test: () => only(true, false, false, false, false) && wx > 0.65,
        label: 'iburyo (right)',
        conf: 0.8,
      },
      {
        test: () => only(true, false, false, false, false) && wy < 0.3,
        label: 'hejuru (up)',
        conf: 0.8,
      },
      {
        test: () => only(true, false, false, false, false) && wy > 0.65,
        label: 'hasi (down)',
        conf: 0.8,
      },
      {
        test: () =>
          openPalm && !palmFacingCamera && wy > 0.4 && wx > 0.4 && wx < 0.6,
        label: 'imbere (forward)',
        conf: 0.75,
      },
      {
        test: () =>
          openPalm && palmFacingCamera && wy > 0.4 && wx > 0.4 && wx < 0.6,
        label: 'inyuma (backward/stop)',
        conf: 0.75,
      },

      // ════════════════════════════════════════════════════════════════════
      // SCHOOL / LEARNING  (Ishuri)
      // ════════════════════════════════════════════════════════════════════
      {
        test: () => extCount === 2 && indexUp && thumbOut && wy < 0.4,
        label: 'ibibazo (question)',
        conf: 0.74,
      },
      {
        test: () =>
          only(true, true, false, false, false) && thumbIndexDist < 0.5,
        label: 'igisubizo (answer)',
        conf: 0.74,
      },
      {
        test: () =>
          extCount === 4 && thumbOut && wy > 0.45 && wx > 0.35 && wx < 0.65,
        label: 'igitabo (book)',
        conf: 0.74,
      },
      {
        test: () =>
          extCount >= 3 &&
          wy > 0.4 &&
          wx > 0.35 &&
          wx < 0.65 &&
          palmFacingCamera,
        label: 'kwiga (study/learn)',
        conf: 0.73,
      },
      {
        test: () => thumbOut && extCount === 1 && indexUp,
        label: 'gusobanukirwa (understand)',
        conf: 0.74,
      },

      // ════════════════════════════════════════════════════════════════════
      // SOCIAL  (Imibanire)
      // ════════════════════════════════════════════════════════════════════
      {
        test: () =>
          extCount === 2 &&
          indexUp &&
          middleUp &&
          indexMiddleDist > 0.7 &&
          palmFacingCamera,
        label: 'amahoro (peace)',
        conf: 0.84,
      },
      {
        test: () =>
          openPalm && palmFacingCamera && wy < 0.45 && wx > 0.3 && wx < 0.7,
        label: 'imbyino (dance)',
        conf: 0.72,
      },
      {
        test: () => fist && wy < 0.5 && wx > 0.3 && wx < 0.7 && thumbOut,
        label: 'akazi (work)',
        conf: 0.76,
      },
      {
        test: () => extCount === 4 && thumbOut && wy < 0.45 && palmFacingCamera,
        label: 'gufasha (help)',
        conf: 0.78,
      },
      {
        test: () =>
          extCount >= 3 &&
          wy > 0.5 &&
          wx > 0.3 &&
          wx < 0.7 &&
          !palmFacingCamera,
        label: 'imbabazi (sorry)',
        conf: 0.74,
      },
      {
        test: () =>
          extCount === 4 && !thumbOut && wy < 0.5 && !palmFacingCamera,
        label: 'reka (please/let)',
        conf: 0.74,
      },
      {
        test: () => openPalm && wy > 0.4 && wy < 0.6 && wx > 0.5,
        label: 'gutumira (invite)',
        conf: 0.72,
      },
      {
        test: () => thumbIndexDist < 0.55 && middleUp && ringUp && pinkyUp,
        label: 'gukunda (love)',
        conf: 0.84,
      },
      {
        test: () =>
          extCount === 2 && indexUp && pinkyUp && !middleUp && !ringUp,
        label: 'injyana (rock on)',
        conf: 0.82,
      },
    ];

    // evaluate rules in order
    for (const rule of rules) {
      if (rule.test()) {
        return { gesture: rule.label, confidence: rule.conf };
      }
    }

    return { gesture: 'unknown', confidence: 0.3 };
  }

  // ─── Dataset ────────────────────────────────────────────────────────────

  async addSamples(dto: AddSamplesDto, userId: string) {
    const label = dto.label.trim().replace(/\s+/g, ' ');
    if (!label) throw new BadRequestException('Give the sign a name.');
    const valid = dto.vectors.filter(
      (v) =>
        Array.isArray(v) &&
        v.length === FEATURE_SIZE &&
        v.every((n) => typeof n === 'number' && Number.isFinite(n)),
    );
    if (!valid.length)
      throw new BadRequestException(
        `Each sample must be ${FEATURE_SIZE} numbers.`,
      );

    await this.sampleModel.insertMany(
      valid.map((vector) => ({
        label,
        vector,
        featureVersion: FEATURE_VERSION,
        recordingId: dto.recordingId,
        createdBy: new Types.ObjectId(userId),
      })),
    );
    const total = await this.sampleModel.countDocuments({
      label,
      featureVersion: FEATURE_VERSION,
    });
    return {
      label,
      added: valid.length,
      rejected: dto.vectors.length - valid.length,
      total,
    };
  }

  async getDatasetSummary() {
    const signs = await this.sampleModel.aggregate([
      { $match: { featureVersion: FEATURE_VERSION } },
      {
        $group: {
          _id: '$label',
          count: { $sum: 1 },
          lastAddedAt: { $max: '$createdAt' },
          recordings: { $addToSet: '$recordingId' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const list = signs.map((s) => ({
      label: s._id as string,
      count: s.count as number,
      lastAddedAt: s.lastAddedAt as Date,
      recordings: (s.recordings as unknown[]).filter(Boolean).length,
    }));
    const trainable = list.filter((s) => s.count >= MIN_SAMPLES_PER_SIGN);
    return {
      signs: list,
      totalSamples: list.reduce((a, s) => a + s.count, 0),
      trainableSigns: trainable.length,
      canTrain: trainable.length >= 2,
      minSamplesPerSign: MIN_SAMPLES_PER_SIGN,
      recommendedSamplesPerSign: RECOMMENDED_SAMPLES_PER_SIGN,
      recommendedRecordingsPerSign: RECOMMENDED_RECORDINGS_PER_SIGN,
    };
  }

  async deleteSign(label: string) {
    const { deletedCount } = await this.sampleModel.deleteMany({ label });
    if (!deletedCount)
      throw new NotFoundException(`No samples found for "${label}".`);
    return { label, deleted: deletedCount };
  }

  /** Removes the most recently recorded samples for a sign, e.g. a bad recording. */
  async undoLatestSamples(label: string, count: number) {
    const latest = await this.sampleModel
      .find({ label })
      .sort({ createdAt: -1, _id: -1 })
      .limit(Math.max(1, Math.min(Number(count) || 1, 500)))
      .select('_id');
    const { deletedCount } = await this.sampleModel.deleteMany({
      _id: { $in: latest.map((s) => s._id) },
    });
    return { label, deleted: deletedCount };
  }

  // ─── Training ───────────────────────────────────────────────────────────

  async createTraining(dto: CreateTrainingDto, userId: string) {
    const running = await this.aiTrainingModel.exists({
      status: { $in: ['pending', 'training'] },
    });
    if (running)
      throw new BadRequestException(
        'A training run is already in progress. Wait for it to finish.',
      );

    const summary = await this.getDatasetSummary();
    if (!summary.canTrain) {
      throw new BadRequestException(
        `Record at least ${MIN_SAMPLES_PER_SIGN} samples for 2 or more signs before training.`,
      );
    }

    const runCount = await this.aiTrainingModel.countDocuments();
    const modelVersion = dto.modelVersion?.trim() || `${runCount + 1}.0`;
    const training = await this.aiTrainingModel.create({
      trainingName: dto.trainingName?.trim() || `Sign model ${modelVersion}`,
      modelVersion,
      epochs: dto.epochs ?? 60,
      batchSize: dto.batchSize ?? 32,
      learningRate: dto.learningRate ?? 0.005,
      hiddenUnits: dto.hiddenUnits ?? 64,
      validationSplit: dto.validationSplit ?? 0.2,
      autoDeploy: dto.autoDeploy ?? true,
      trainedBy: new Types.ObjectId(userId),
      status: 'pending',
    });

    // Runs in the background; the admin page polls for progress.
    void this.runTraining(String(training._id));
    return training;
  }

  private async runTraining(id: string) {
    const started = Date.now();
    try {
      const run = await this.aiTrainingModel.findById(id);
      if (!run) return;

      const samples = await this.sampleModel
        .find({ featureVersion: FEATURE_VERSION })
        .select('label vector recordingId')
        .lean();
      const counts = new Map<string, number>();
      for (const s of samples)
        counts.set(s.label, (counts.get(s.label) ?? 0) + 1);
      const skippedLabels = [...counts]
        .filter(([, n]) => n < MIN_SAMPLES_PER_SIGN)
        .map(([l]) => l);
      const data = samples.filter(
        (s) => (counts.get(s.label) ?? 0) >= MIN_SAMPLES_PER_SIGN,
      );
      if (new Set(data.map((d) => d.label)).size < 2) {
        throw new Error(
          `Need at least 2 signs with ${MIN_SAMPLES_PER_SIGN}+ samples each.`,
        );
      }

      await this.aiTrainingModel.updateOne(
        { _id: id },
        {
          status: 'training',
          startedAt: new Date(),
          datasetSize: data.length,
          skippedLabels,
          currentEpoch: 0,
          history: [],
        },
      );

      const result = await trainSignModel(
        data.map((d) => ({
          label: d.label,
          vector: d.vector,
          group: d.recordingId,
        })),
        {
          epochs: run.epochs,
          batchSize: run.batchSize,
          learningRate: run.learningRate,
          hiddenUnits: run.hiddenUnits,
          validationSplit: run.validationSplit,
        },
        async (stats) => {
          await this.aiTrainingModel.updateOne(
            { _id: id },
            {
              currentEpoch: stats.epoch,
              accuracy: stats.accuracy,
              valAccuracy: stats.valAccuracy,
              loss: stats.loss,
              valLoss: stats.valLoss,
              $push: { history: stats },
            },
          );
        },
      );

      await this.aiTrainingModel.updateOne(
        { _id: id },
        {
          status: 'completed',
          accuracy: result.trainAccuracy,
          valAccuracy: result.valAccuracy,
          loss: result.loss,
          valLoss: result.valLoss,
          bestEpoch: result.bestEpoch,
          noveltyCheck: true,
          labels: result.model.labels,
          model: { ...result.model, featureVersion: FEATURE_VERSION },
          modelMetrics: {
            perClass: result.perClass,
            confusion: result.confusion,
            trainCount: result.trainCount,
            valCount: result.valCount,
          },
          trainingTime: Date.now() - started,
          finishedAt: new Date(),
        },
      );

      if (run.autoDeploy) {
        const active = await this.aiTrainingModel
          .findOne({ isActive: true })
          .select('valAccuracy labels noveltyCheck');
        const better =
          !active ||
          !active.noveltyCheck ||
          result.valAccuracy >= (active.valAccuracy ?? 0) ||
          // A model that knows more signs is worth a small accuracy trade-off
          (result.model.labels.length > (active.labels?.length ?? 0) &&
            result.valAccuracy >= 0.85);
        if (better) await this.deployTraining(id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Training failed.';
      this.logger.error(`Training ${id} failed: ${message}`);
      await this.aiTrainingModel.updateOne(
        { _id: id },
        {
          status: 'failed',
          errorMessage: message,
          trainingTime: Date.now() - started,
          finishedAt: new Date(),
        },
      );
    }
  }

  async getTrainingHistory() {
    return this.aiTrainingModel.find().sort({ createdAt: -1 }).limit(50);
  }

  async getTraining(id: string, includeModel = false) {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('Training not found');
    const query = this.aiTrainingModel.findById(id);
    if (includeModel) query.select('+model');
    const training = await query;
    if (!training) throw new NotFoundException('Training not found');
    return training;
  }

  async deployTraining(id: string) {
    const training = await this.getTraining(id, true);
    if (training.status !== 'completed' || !training.model) {
      throw new BadRequestException(
        'Only a completed training run can be deployed.',
      );
    }
    if (!training.noveltyCheck) {
      throw new BadRequestException(
        'This model was trained with an older version. Train a new model instead.',
      );
    }
    await this.aiTrainingModel.updateMany(
      { _id: { $ne: training._id }, isActive: true },
      { isActive: false },
    );
    await this.aiTrainingModel.updateOne(
      { _id: training._id },
      { isActive: true, deployedAt: new Date() },
    );
    return this.getTraining(id);
  }

  /** Stop using custom models; Sign to Text falls back to the built-in gestures. */
  async undeployAll() {
    await this.aiTrainingModel.updateMany(
      { isActive: true },
      { isActive: false },
    );
    return { ok: true };
  }

  async deleteTraining(id: string) {
    const training = await this.getTraining(id);
    if (training.status === 'pending' || training.status === 'training') {
      throw new BadRequestException(
        'Wait for this run to finish before deleting it.',
      );
    }
    if (training.isActive)
      throw new BadRequestException(
        'This model is in use. Deploy another model first.',
      );
    await training.deleteOne();
    return { deleted: true };
  }

  private async getActiveModelSummary() {
    return this.aiTrainingModel
      .findOne({ isActive: true })
      .select(
        'trainingName modelVersion valAccuracy accuracy labels deployedAt datasetSize',
      )
      .lean();
  }

  /** The deployed model's weights, for running recognition in the browser. */
  async getActiveModel() {
    const active = await this.aiTrainingModel
      .findOne({ isActive: true })
      .select('+model modelVersion trainingName valAccuracy deployedAt')
      .lean();
    if (!active?.model) return null;
    return this.toClientModel(active);
  }

  /** A specific run's weights, so admins can test a model before deploying it. */
  async getTrainingModel(id: string) {
    const training = await this.getTraining(id, true);
    if (!training.model)
      throw new BadRequestException('This run has no trained model.');
    return this.toClientModel(training.toObject());
  }

  private toClientModel(run: any) {
    return {
      id: String(run._id),
      modelVersion: run.modelVersion,
      trainingName: run.trainingName,
      valAccuracy: run.valAccuracy,
      deployedAt: run.deployedAt,
      ...run.model,
    };
  }
}
