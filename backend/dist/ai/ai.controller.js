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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiController = void 0;
const common_1 = require("@nestjs/common");
const ai_service_1 = require("./ai.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const create_training_dto_1 = require("./dto/create-training.dto");
const add_samples_dto_1 = require("./dto/add-samples.dto");
const log_prediction_dto_1 = require("./dto/log-prediction.dto");
let AiController = class AiController {
    aiService;
    constructor(aiService) {
        this.aiService = aiService;
    }
    async predict(gestureData) {
        return this.aiService.processGesture(gestureData);
    }
    async getActiveModel() {
        return this.aiService.getActiveModel();
    }
    async logPrediction(dto, req) {
        await this.aiService.recordPrediction(dto, req.user?.id);
        return { ok: true };
    }
    async getLogs(limit, source) {
        return this.aiService.getLogs(limit, source);
    }
    async getStats() {
        return this.aiService.getStats();
    }
    async getDataset() {
        return this.aiService.getDatasetSummary();
    }
    async addSamples(dto, req) {
        return this.aiService.addSamples(dto, req.user.id);
    }
    async deleteSign(label) {
        return this.aiService.deleteSign(label);
    }
    async undoLatestSamples(label, count) {
        return this.aiService.undoLatestSamples(label, count);
    }
    async createTraining(createTrainingDto, req) {
        return this.aiService.createTraining(createTrainingDto, req.user.id);
    }
    async getTrainingHistory() {
        return this.aiService.getTrainingHistory();
    }
    async undeploy() {
        return this.aiService.undeployAll();
    }
    async getTraining(id) {
        return this.aiService.getTraining(id);
    }
    async getTrainingModel(id) {
        return this.aiService.getTrainingModel(id);
    }
    async deployTraining(id) {
        return this.aiService.deployTraining(id);
    }
    async deleteTraining(id) {
        return this.aiService.deleteTraining(id);
    }
};
exports.AiController = AiController;
__decorate([
    (0, common_1.Post)('predict'),
    __param(0, (0, common_1.Body)('gestureData')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "predict", null);
__decorate([
    (0, common_1.Get)('model/active'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getActiveModel", null);
__decorate([
    (0, common_1.Post)('logs'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [log_prediction_dto_1.LogPredictionDto, Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "logPrediction", null);
__decorate([
    (0, common_1.Get)('logs'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('source')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getLogs", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, roles_decorator_1.Roles)('admin'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('samples'),
    (0, roles_decorator_1.Roles)('admin'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getDataset", null);
__decorate([
    (0, common_1.Post)('samples'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [add_samples_dto_1.AddSamplesDto, Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "addSamples", null);
__decorate([
    (0, common_1.Delete)('samples/:label'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('label')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "deleteSign", null);
__decorate([
    (0, common_1.Delete)('samples/:label/latest'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('label')),
    __param(1, (0, common_1.Query)('count')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "undoLatestSamples", null);
__decorate([
    (0, common_1.Post)('training'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_training_dto_1.CreateTrainingDto, Object]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "createTraining", null);
__decorate([
    (0, common_1.Get)('training'),
    (0, roles_decorator_1.Roles)('admin'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getTrainingHistory", null);
__decorate([
    (0, common_1.Post)('training/undeploy'),
    (0, roles_decorator_1.Roles)('admin'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AiController.prototype, "undeploy", null);
__decorate([
    (0, common_1.Get)('training/:id'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getTraining", null);
__decorate([
    (0, common_1.Get)('training/:id/model'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getTrainingModel", null);
__decorate([
    (0, common_1.Post)('training/:id/deploy'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "deployTraining", null);
__decorate([
    (0, common_1.Delete)('training/:id'),
    (0, roles_decorator_1.Roles)('admin'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "deleteTraining", null);
exports.AiController = AiController = __decorate([
    (0, common_1.Controller)('ai'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [ai_service_1.AiService])
], AiController);
