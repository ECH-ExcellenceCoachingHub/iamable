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
exports.TrainingSampleSchema = exports.TrainingSample = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let TrainingSample = class TrainingSample {
    label;
    vector;
    featureVersion;
    recordingId;
    createdBy;
};
exports.TrainingSample = TrainingSample;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, index: true }),
    __metadata("design:type", String)
], TrainingSample.prototype, "label", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Number], required: true }),
    __metadata("design:type", Array)
], TrainingSample.prototype, "vector", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], TrainingSample.prototype, "featureVersion", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], TrainingSample.prototype, "recordingId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User' }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], TrainingSample.prototype, "createdBy", void 0);
exports.TrainingSample = TrainingSample = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], TrainingSample);
exports.TrainingSampleSchema = mongoose_1.SchemaFactory.createForClass(TrainingSample);
