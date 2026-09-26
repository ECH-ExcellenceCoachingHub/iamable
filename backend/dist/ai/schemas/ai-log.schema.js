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
exports.AILogSchema = exports.AILog = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let AILog = class AILog {
    modelVersion;
    predictionData;
    accuracy;
    processingTime;
    gestureRecognized;
    confidence;
    source;
    expected;
    correct;
    userId;
};
exports.AILog = AILog;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], AILog.prototype, "modelVersion", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], AILog.prototype, "predictionData", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], AILog.prototype, "accuracy", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], AILog.prototype, "processingTime", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AILog.prototype, "gestureRecognized", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], AILog.prototype, "confidence", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'api', index: true }),
    __metadata("design:type", String)
], AILog.prototype, "source", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], AILog.prototype, "expected", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Boolean)
], AILog.prototype, "correct", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], AILog.prototype, "userId", void 0);
exports.AILog = AILog = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], AILog);
exports.AILogSchema = mongoose_1.SchemaFactory.createForClass(AILog);
