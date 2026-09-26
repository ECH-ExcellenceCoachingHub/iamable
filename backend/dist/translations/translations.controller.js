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
exports.TranslationsController = void 0;
const common_1 = require("@nestjs/common");
const translations_service_1 = require("./translations.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const create_translation_dto_1 = require("./dto/create-translation.dto");
const update_translation_dto_1 = require("./dto/update-translation.dto");
let TranslationsController = class TranslationsController {
    translationsService;
    constructor(translationsService) {
        this.translationsService = translationsService;
    }
    async create(req, createTranslationDto) {
        return this.translationsService.create(req.user.id, createTranslationDto);
    }
    async findAll(req) {
        return this.translationsService.findAll(req.user.id);
    }
    async getHistory(req, limit) {
        return this.translationsService.getHistory(req.user.id, limit);
    }
    async getSavedItems(req) {
        return this.translationsService.getSavedItems(req.user.id);
    }
    async getStats(req) {
        return this.translationsService.getStats(req.user.id);
    }
    async findOne(id, req) {
        return this.translationsService.findOne(id, req.user.id);
    }
    async update(id, req, updateTranslationDto) {
        return this.translationsService.update(id, req.user.id, updateTranslationDto);
    }
    async saveItem(id, req, notes) {
        return this.translationsService.saveItem(req.user.id, id, notes);
    }
    async unsaveItem(id, req) {
        return this.translationsService.unsaveItem(req.user.id, id);
    }
    async remove(id, req) {
        return this.translationsService.remove(id, req.user.id);
    }
};
exports.TranslationsController = TranslationsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_translation_dto_1.CreateTranslationDto]),
    __metadata("design:returntype", Promise)
], TranslationsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TranslationsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], TranslationsController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Get)('saved'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TranslationsController.prototype, "getSavedItems", null);
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TranslationsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TranslationsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, update_translation_dto_1.UpdateTranslationDto]),
    __metadata("design:returntype", Promise)
], TranslationsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/save'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)('notes')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], TranslationsController.prototype, "saveItem", null);
__decorate([
    (0, common_1.Delete)(':id/save'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TranslationsController.prototype, "unsaveItem", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TranslationsController.prototype, "remove", null);
exports.TranslationsController = TranslationsController = __decorate([
    (0, common_1.Controller)('translations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [translations_service_1.TranslationsService])
], TranslationsController);
