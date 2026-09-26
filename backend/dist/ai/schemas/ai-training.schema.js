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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AITrainingSchema = exports.AITraining = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let AITraining = class AITraining {
    trainingName;
    modelVersion;
    status;
    trainingData;
    datasetSize;
    epochs;
    batchSize;
    learningRate;
    hiddenUnits;
    validationSplit;
    autoDeploy;
    currentEpoch;
    history;
    accuracy;
    valAccuracy;
    loss;
    valLoss;
    bestEpoch;
    labels;
    skippedLabels;
    trainingTime;
    startedAt;
    finishedAt;
    errorMessage;
    trainedBy;
    modelMetrics;
    model;
    noveltyCheck;
    isActive;
    deployedAt;
};
exports.AITraining = AITraining;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], AITraining.prototype, "trainingName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], AITraining.prototype, "modelVersion", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        enum: ['pending', 'training', 'completed', 'failed'],
        default: 'pending',
    }),
    __metadata("design:type", String)
], AITraining.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], AITraining.prototype, "trainingData", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], AITraining.prototype, "datasetSize", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], AITraining.prototype, "epochs", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], AITraining.prototype, "batchSize", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], AITraining.prototype, "learningRate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 64 }),
    __metadata("design:type", Number)
], AITraining.prototype, "hiddenUnits", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0.2 }),
    __metadata("design:type", Number)
], AITraining.prototype, "validationSplit", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], AITraining.prototype, "autoDeploy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], AITraining.prototype, "currentEpoch", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], AITraining.prototype, "history", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], AITraining.prototype, "accuracy", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], AITraining.prototype, "valAccuracy", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], AITraining.prototype, "loss", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], AITraining.prototype, "valLoss", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], AITraining.prototype, "bestEpoch", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], AITraining.prototype, "labels", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], AITraining.prototype, "skippedLabels", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], AITraining.prototype, "trainingTime", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], AITraining.prototype, "startedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], AITraining.prototype, "finishedAt", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AITraining.prototype, "errorMessage", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], AITraining.prototype, "trainedBy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], AITraining.prototype, "modelMetrics", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, select: false }),
    __metadata("design:type", Object)
], AITraining.prototype, "model", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], AITraining.prototype, "noveltyCheck", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false, index: true }),
    __metadata("design:type", Boolean)
], AITraining.prototype, "isActive", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], AITraining.prototype, "deployedAt", void 0);
exports.AITraining = AITraining = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], AITraining);
exports.AITrainingSchema = mongoose_1.SchemaFactory.createForClass(AITraining);
