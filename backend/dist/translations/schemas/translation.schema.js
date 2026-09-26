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
exports.TranslationSchema = exports.Translation = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let Translation = class Translation {
    userId;
    inputType;
    inputContent;
    translatedText;
    confidenceScore;
    gestureData;
    isSaved;
    autoRecorded;
};
exports.Translation = Translation;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Translation.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['sign-to-text', 'text-to-sign', 'voice-to-sign'] }),
    __metadata("design:type", String)
], Translation.prototype, "inputType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Translation.prototype, "inputContent", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Translation.prototype, "translatedText", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Translation.prototype, "confidenceScore", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Translation.prototype, "gestureData", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Translation.prototype, "isSaved", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Boolean)
], Translation.prototype, "autoRecorded", void 0);
exports.Translation = Translation = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Translation);
exports.TranslationSchema = mongoose_1.SchemaFactory.createForClass(Translation);
