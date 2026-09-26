"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AiService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = exports.RECOMMENDED_RECORDINGS_PER_SIGN = exports.RECOMMENDED_SAMPLES_PER_SIGN = exports.MIN_SAMPLES_PER_SIGN = exports.FEATURE_SIZE = exports.FEATURE_VERSION = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const ai_log_schema_1 = require("./schemas/ai-log.schema");
const ai_training_schema_1 = require("./schemas/ai-training.schema");
const training_sample_schema_1 = require("./schemas/training-sample.schema");
const trainer_1 = require("./trainer");
exports.FEATURE_VERSION = 'body-v1';
exports.FEATURE_SIZE = 1360;
exports.MIN_SAMPLES_PER_SIGN = 10;
exports.RECOMMENDED_SAMPLES_PER_SIGN = 100;
exports.RECOMMENDED_RECORDINGS_PER_SIGN = 2;
function dist(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}
function extractFeatures(lm) {
    const wrist = lm[0];
    const tMCP = lm[1], tIP = lm[2], tPIP = lm[3], tTip = lm[4];
    const iMCP = lm[5], iPIP = lm[6], iDIP = lm[7], iTip = lm[8];
    const mMCP = lm[9], mPIP = lm[10], mDIP = lm[11], mTip = lm[12];
    const rMCP = lm[13], rPIP = lm[14], rDIP = lm[15], rTip = lm[16];
    const pMCP = lm[17], pPIP = lm[18], pDIP = lm[19], pTip = lm[20];
    const handSize = dist(wrist, mMCP) || 0.001;
    const fExt = (tip, pip, mcp) => dist(tip, mcp) / (dist(pip, mcp) + 0.001) > 1.3;
    const curlRatio = (tip, pip, mcp) => Math.min(dist(tip, mcp) / (dist(pip, mcp) + 0.001), 2.5);
    const indexUp = fExt(iTip, iPIP, iMCP);
    const middleUp = fExt(mTip, mPIP, mMCP);
    const ringUp = fExt(rTip, rPIP, rMCP);
    const pinkyUp = fExt(pTip, pPIP, pMCP);
    const extCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;
    const thumbOut = dist(tTip, iMCP) > handSize * 1.2;
    const thumbUp = thumbOut && tTip.y < tPIP.y;
    const thumbDown = thumbOut && tTip.y > tPIP.y;
    const extCountWithThumb = extCount + (thumbOut ? 1 : 0);
    const avgTipZ = (iTip.z + mTip.z + rTip.z + pTip.z) / 4;
    const avgMcpZ = (iMCP.z + mMCP.z + rMCP.z + pMCP.z) / 4;
    const palmFacingCamera = avgTipZ < avgMcpZ;
    const nd = (a, b) => dist(a, b) / handSize;
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
let AiService = AiService_1 = class AiService {
    aiLogModel;
    aiTrainingModel;
    sampleModel;
    logger = new common_1.Logger(AiService_1.name);
    constructor(aiLogModel, aiTrainingModel, sampleModel) {
        this.aiLogModel = aiLogModel;
        this.aiTrainingModel = aiTrainingModel;
        this.sampleModel = sampleModel;
    }
    async onModuleInit() {
        await this.aiTrainingModel.updateMany({ status: { $in: ['pending', 'training'] } }, {
            status: 'failed',
            errorMessage: 'The server restarted before training finished. Start a new run.',
            finishedAt: new Date(),
        });
    }
    async logPrediction(logData) {
        return this.aiLogModel.create({ modelVersion: 'rules-v1', ...logData });
    }
    async recordPrediction(dto, userId) {
        const expected = dto.expected?.trim();
        return this.logPrediction({
            gestureRecognized: dto.gesture,
            confidence: dto.confidence,
            processingTime: dto.processingTime,
            modelVersion: dto.modelVersion || 'built-in',
            source: dto.source ?? 'sign-to-text',
            ...(expected ? { expected, correct: expected === dto.gesture } : {}),
            ...(userId ? { userId: new mongoose_2.Types.ObjectId(userId) } : {}),
        });
    }
    async getLogs(limit = 100, source) {
        const filter = source ? { source } : {};
        return this.aiLogModel
            .find(filter)
            .select('-predictionData')
            .sort({ createdAt: -1 })
            .limit(Math.min(Number(limit) || 100, 500));
    }
    async getStats() {
        const [totals, gestureDistribution, perSign, bySource, activeModel] = await Promise.all([
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
            verifiedAccuracy: t?.verified ? t.correct / t.verified : null,
            gestureDistribution,
            perSignAccuracy: perSign,
            bySource,
            activeModel,
        };
    }
    async processGesture(gestureData) {
        const startTime = Date.now();
        const landmarks = gestureData?.landmarks;
        if (!Array.isArray(landmarks) || landmarks.length < 21) {
            throw new common_1.BadRequestException('gestureData.landmarks must contain the 21 MediaPipe hand landmarks.');
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
    classifyGesture(landmarks) {
        const f = extractFeatures(landmarks);
        const { thumbUp, thumbDown, thumbOut, indexUp, middleUp, ringUp, pinkyUp, extCount, extCountWithThumb, indexCurl, middleCurl, ringCurl, pinkyCurl, thumbIndexDist, thumbMiddleDist, thumbPinkyDist, indexMiddleDist, middleRingDist, ringPinkyDist, wx, wy, palmFacingCamera, } = f;
        const fist = extCount === 0 && !thumbOut;
        const openPalm = extCount === 4 && thumbOut;
        const only = (i, m, r, p, t) => indexUp === i &&
            middleUp === m &&
            ringUp === r &&
            pinkyUp === p &&
            thumbOut === t;
        const rules = [
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
                test: () => extCount === 2 && indexUp && middleUp && palmFacingCamera && wy < 0.4,
                label: 'urakoze (thank you)',
                conf: 0.87,
            },
            {
                test: () => extCount === 3 && indexUp && middleUp && ringUp && palmFacingCamera,
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
            {
                test: () => only(true, false, false, false, false) && wy < 0.5,
                label: 'yego (yes)',
                conf: 0.88,
            },
            { test: () => fist && !thumbOut, label: 'oya (no)', conf: 0.9 },
            {
                test: () => only(true, false, false, false, true) && thumbIndexDist > 1.2,
                label: 'kumva (understand)',
                conf: 0.8,
            },
            {
                test: () => openPalm && wy > 0.6,
                label: 'tangira (stop/start)',
                conf: 0.75,
            },
            {
                test: () => only(true, false, false, false, false),
                label: 'rimwe (one)',
                conf: 0.9,
            },
            {
                test: () => only(true, true, false, false, false) && indexMiddleDist < 0.6,
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
                test: () => thumbOut && !indexUp && !middleUp && !ringUp && !pinkyUp && wy < 0.5,
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
                test: () => thumbIndexDist < 0.5 && only(false, true, false, false, false),
                label: 'cumi na rimwe (eleven)',
                conf: 0.76,
            },
            {
                test: () => thumbIndexDist < 0.5 && only(false, true, true, false, false),
                label: 'cumi na kabiri (twelve)',
                conf: 0.75,
            },
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
                test: () => only(true, true, false, false, false) && indexMiddleDist > 0.7,
                label: 'umukunzi (lover)',
                conf: 0.78,
            },
            {
                test: () => only(false, false, false, false, true) && thumbPinkyDist < 0.5,
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
                test: () => extCount === 3 && ringUp && middleUp && indexUp && wy < 0.35,
                label: 'umwana (child)',
                conf: 0.75,
            },
            {
                test: () => fist && wx > 0.6 && wy > 0.35,
                label: 'mucye (brother/sister)',
                conf: 0.7,
            },
            {
                test: () => openPalm && palmFacingCamera && wy > 0.5 && wx > 0.3 && wx < 0.7,
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
                test: () => extCount === 3 && indexUp && middleUp && ringUp && wy < 0.45,
                label: 'gutega amatwi (listen)',
                conf: 0.74,
            },
            {
                test: () => extCount === 2 && indexUp && middleUp && thumbOut && wy < 0.35,
                label: 'kureba (look)',
                conf: 0.74,
            },
            {
                test: () => only(false, false, false, false, true) &&
                    thumbOut &&
                    wy < 0.45 &&
                    wx > 0.6,
                label: 'gutumanahana (phone)',
                conf: 0.8,
            },
            {
                test: () => openPalm && !palmFacingCamera && wy < 0.4 && wx > 0.3 && wx < 0.7,
                label: 'kwandika (write)',
                conf: 0.74,
            },
            {
                test: () => extCount === 3 && middleUp && ringUp && pinkyUp && wy < 0.45,
                label: 'gusoma (read)',
                conf: 0.74,
            },
            {
                test: () => extCount === 0 && thumbOut && wy > 0.5 && wx > 0.3 && wx < 0.7,
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
            {
                test: () => extCount === 2 &&
                    indexUp &&
                    middleUp &&
                    indexMiddleDist > 0.65 &&
                    wy < 0.45,
                label: 'inzu (home)',
                conf: 0.8,
            },
            {
                test: () => extCount === 4 && !thumbOut && wy > 0.5 && wx > 0.4 && wx < 0.6,
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
                test: () => extCount === 2 && indexUp && middleUp && indexMiddleDist < 0.4,
                label: "inzira y'ishyiga (train)",
                conf: 0.74,
            },
            {
                test: () => extCount === 4 && thumbOut && wy < 0.3 && wx > 0.2 && wx < 0.8,
                label: 'indege (airplane)',
                conf: 0.74,
            },
            {
                test: () => extCount === 3 &&
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
                test: () => extCount === 1 && middleUp && wy > 0.5 && wx > 0.4 && wx < 0.6,
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
                test: () => thumbIndexDist < 0.6 && thumbIndexDist > 0.3 && extCount === 0,
                label: 'amafaranga (money)',
                conf: 0.74,
            },
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
                test: () => extCount >= 2 && wy > 0.4 && wx > 0.3 && wx < 0.7 && wy < 0.6,
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
            {
                test: () => fist && wy < 0.45 && wx > 0.4 && wx < 0.6 && palmFacingCamera,
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
            {
                test: () => extCount === 2 && indexUp && middleUp && wy > 0.6 && wx < 0.3,
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
            {
                test: () => only(false, false, false, false, true) && thumbOut && wx > 0.6,
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
                test: () => extCount >= 3 &&
                    wy < 0.45 &&
                    wx > 0.35 &&
                    wx < 0.65 &&
                    !palmFacingCamera,
                label: 'kwandika (write)',
                conf: 0.72,
            },
            {
                test: () => only(true, false, false, false, true) && thumbIndexDist > 1.0,
                label: 'umutuku (red)',
                conf: 0.74,
            },
            {
                test: () => only(false, true, true, false, false) && middleRingDist < 0.4,
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
                test: () => openPalm && !palmFacingCamera && wy > 0.4 && wx > 0.4 && wx < 0.6,
                label: 'imbere (forward)',
                conf: 0.75,
            },
            {
                test: () => openPalm && palmFacingCamera && wy > 0.4 && wx > 0.4 && wx < 0.6,
                label: 'inyuma (backward/stop)',
                conf: 0.75,
            },
            {
                test: () => extCount === 2 && indexUp && thumbOut && wy < 0.4,
                label: 'ibibazo (question)',
                conf: 0.74,
            },
            {
                test: () => only(true, true, false, false, false) && thumbIndexDist < 0.5,
                label: 'igisubizo (answer)',
                conf: 0.74,
            },
            {
                test: () => extCount === 4 && thumbOut && wy > 0.45 && wx > 0.35 && wx < 0.65,
                label: 'igitabo (book)',
                conf: 0.74,
            },
            {
                test: () => extCount >= 3 &&
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
            {
                test: () => extCount === 2 &&
                    indexUp &&
                    middleUp &&
                    indexMiddleDist > 0.7 &&
                    palmFacingCamera,
                label: 'amahoro (peace)',
                conf: 0.84,
            },
            {
                test: () => openPalm && palmFacingCamera && wy < 0.45 && wx > 0.3 && wx < 0.7,
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
                test: () => extCount >= 3 &&
                    wy > 0.5 &&
                    wx > 0.3 &&
                    wx < 0.7 &&
                    !palmFacingCamera,
                label: 'imbabazi (sorry)',
                conf: 0.74,
            },
            {
                test: () => extCount === 4 && !thumbOut && wy < 0.5 && !palmFacingCamera,
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
                test: () => extCount === 2 && indexUp && pinkyUp && !middleUp && !ringUp,
                label: 'injyana (rock on)',
                conf: 0.82,
            },
        ];
        for (const rule of rules) {
            if (rule.test()) {
                return { gesture: rule.label, confidence: rule.conf };
            }
        }
        return { gesture: 'unknown', confidence: 0.3 };
    }
    async addSamples(dto, userId) {
        const label = dto.label.trim().replace(/\s+/g, ' ');
        if (!label)
            throw new common_1.BadRequestException('Give the sign a name.');
        const valid = dto.vectors.filter((v) => Array.isArray(v) &&
            v.length === exports.FEATURE_SIZE &&
            v.every((n) => typeof n === 'number' && Number.isFinite(n)));
        if (!valid.length)
            throw new common_1.BadRequestException(`Each sample must be ${exports.FEATURE_SIZE} numbers.`);
        await this.sampleModel.insertMany(valid.map((vector) => ({
            label,
            vector,
            featureVersion: exports.FEATURE_VERSION,
            recordingId: dto.recordingId,
            createdBy: new mongoose_2.Types.ObjectId(userId),
        })));
        const total = await this.sampleModel.countDocuments({
            label,
            featureVersion: exports.FEATURE_VERSION,
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
            { $match: { featureVersion: exports.FEATURE_VERSION } },
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
            label: s._id,
            count: s.count,
            lastAddedAt: s.lastAddedAt,
            recordings: s.recordings.filter(Boolean).length,
        }));
        const trainable = list.filter((s) => s.count >= exports.MIN_SAMPLES_PER_SIGN);
        return {
            signs: list,
            totalSamples: list.reduce((a, s) => a + s.count, 0),
            trainableSigns: trainable.length,
            canTrain: trainable.length >= 2,
            minSamplesPerSign: exports.MIN_SAMPLES_PER_SIGN,
            recommendedSamplesPerSign: exports.RECOMMENDED_SAMPLES_PER_SIGN,
            recommendedRecordingsPerSign: exports.RECOMMENDED_RECORDINGS_PER_SIGN,
        };
    }
    async deleteSign(label) {
        const { deletedCount } = await this.sampleModel.deleteMany({ label });
        if (!deletedCount)
            throw new common_1.NotFoundException(`No samples found for "${label}".`);
        return { label, deleted: deletedCount };
    }
    async undoLatestSamples(label, count) {
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
    async createTraining(dto, userId) {
        const running = await this.aiTrainingModel.exists({
            status: { $in: ['pending', 'training'] },
        });
        if (running)
            throw new common_1.BadRequestException('A training run is already in progress. Wait for it to finish.');
        const summary = await this.getDatasetSummary();
        if (!summary.canTrain) {
            throw new common_1.BadRequestException(`Record at least ${exports.MIN_SAMPLES_PER_SIGN} samples for 2 or more signs before training.`);
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
            trainedBy: new mongoose_2.Types.ObjectId(userId),
            status: 'pending',
        });
        void this.runTraining(String(training._id));
        return training;
    }
    async runTraining(id) {
        const started = Date.now();
        try {
            const run = await this.aiTrainingModel.findById(id);
            if (!run)
                return;
            const samples = await this.sampleModel
                .find({ featureVersion: exports.FEATURE_VERSION })
                .select('label vector recordingId')
                .lean();
            const counts = new Map();
            for (const s of samples)
                counts.set(s.label, (counts.get(s.label) ?? 0) + 1);
            const skippedLabels = [...counts]
                .filter(([, n]) => n < exports.MIN_SAMPLES_PER_SIGN)
                .map(([l]) => l);
            const data = samples.filter((s) => (counts.get(s.label) ?? 0) >= exports.MIN_SAMPLES_PER_SIGN);
            if (new Set(data.map((d) => d.label)).size < 2) {
                throw new Error(`Need at least 2 signs with ${exports.MIN_SAMPLES_PER_SIGN}+ samples each.`);
            }
            await this.aiTrainingModel.updateOne({ _id: id }, {
                status: 'training',
                startedAt: new Date(),
                datasetSize: data.length,
                skippedLabels,
                currentEpoch: 0,
                history: [],
            });
            const result = await (0, trainer_1.trainSignModel)(data.map((d) => ({
                label: d.label,
                vector: d.vector,
                group: d.recordingId,
            })), {
                epochs: run.epochs,
                batchSize: run.batchSize,
                learningRate: run.learningRate,
                hiddenUnits: run.hiddenUnits,
                validationSplit: run.validationSplit,
            }, async (stats) => {
                await this.aiTrainingModel.updateOne({ _id: id }, {
                    currentEpoch: stats.epoch,
                    accuracy: stats.accuracy,
                    valAccuracy: stats.valAccuracy,
                    loss: stats.loss,
                    valLoss: stats.valLoss,
                    $push: { history: stats },
                });
            });
            await this.aiTrainingModel.updateOne({ _id: id }, {
                status: 'completed',
                accuracy: result.trainAccuracy,
                valAccuracy: result.valAccuracy,
                loss: result.loss,
                valLoss: result.valLoss,
                bestEpoch: result.bestEpoch,
                noveltyCheck: true,
                labels: result.model.labels,
                model: { ...result.model, featureVersion: exports.FEATURE_VERSION },
                modelMetrics: {
                    perClass: result.perClass,
                    confusion: result.confusion,
                    trainCount: result.trainCount,
                    valCount: result.valCount,
                },
                trainingTime: Date.now() - started,
                finishedAt: new Date(),
            });
            if (run.autoDeploy) {
                const active = await this.aiTrainingModel
                    .findOne({ isActive: true })
                    .select('valAccuracy labels noveltyCheck');
                const better = !active ||
                    !active.noveltyCheck ||
                    result.valAccuracy >= (active.valAccuracy ?? 0) ||
                    (result.model.labels.length > (active.labels?.length ?? 0) &&
                        result.valAccuracy >= 0.85);
                if (better)
                    await this.deployTraining(id);
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Training failed.';
            this.logger.error(`Training ${id} failed: ${message}`);
            await this.aiTrainingModel.updateOne({ _id: id }, {
                status: 'failed',
                errorMessage: message,
                trainingTime: Date.now() - started,
                finishedAt: new Date(),
            });
        }
    }
    async getTrainingHistory() {
        return this.aiTrainingModel.find().sort({ createdAt: -1 }).limit(50);
    }
    async getTraining(id, includeModel = false) {
        if (!mongoose_2.Types.ObjectId.isValid(id))
            throw new common_1.NotFoundException('Training not found');
        const query = this.aiTrainingModel.findById(id);
        if (includeModel)
            query.select('+model');
        const training = await query;
        if (!training)
            throw new common_1.NotFoundException('Training not found');
        return training;
    }
    async deployTraining(id) {
        const training = await this.getTraining(id, true);
        if (training.status !== 'completed' || !training.model) {
            throw new common_1.BadRequestException('Only a completed training run can be deployed.');
        }
        if (!training.noveltyCheck) {
            throw new common_1.BadRequestException('This model was trained with an older version. Train a new model instead.');
        }
        await this.aiTrainingModel.updateMany({ _id: { $ne: training._id }, isActive: true }, { isActive: false });
        await this.aiTrainingModel.updateOne({ _id: training._id }, { isActive: true, deployedAt: new Date() });
        return this.getTraining(id);
    }
    async undeployAll() {
        await this.aiTrainingModel.updateMany({ isActive: true }, { isActive: false });
        return { ok: true };
    }
    async deleteTraining(id) {
        const training = await this.getTraining(id);
        if (training.status === 'pending' || training.status === 'training') {
            throw new common_1.BadRequestException('Wait for this run to finish before deleting it.');
        }
        if (training.isActive)
            throw new common_1.BadRequestException('This model is in use. Deploy another model first.');
        await training.deleteOne();
        return { deleted: true };
    }
    async getActiveModelSummary() {
        return this.aiTrainingModel
            .findOne({ isActive: true })
            .select('trainingName modelVersion valAccuracy accuracy labels deployedAt datasetSize')
            .lean();
    }
    async getActiveModel() {
        const active = await this.aiTrainingModel
            .findOne({ isActive: true })
            .select('+model modelVersion trainingName valAccuracy deployedAt')
            .lean();
        if (!active?.model)
            return null;
        return this.toClientModel(active);
    }
    async getTrainingModel(id) {
        const training = await this.getTraining(id, true);
        if (!training.model)
            throw new common_1.BadRequestException('This run has no trained model.');
        return this.toClientModel(training.toObject());
    }
    toClientModel(run) {
        return {
            id: String(run._id),
            modelVersion: run.modelVersion,
            trainingName: run.trainingName,
            valAccuracy: run.valAccuracy,
            deployedAt: run.deployedAt,
            ...run.model,
        };
    }
};
exports.AiService = AiService;
exports.AiService = AiService = AiService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(ai_log_schema_1.AILog.name)),
    __param(1, (0, mongoose_1.InjectModel)(ai_training_schema_1.AITraining.name)),
    __param(2, (0, mongoose_1.InjectModel)(training_sample_schema_1.TrainingSample.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], AiService);
