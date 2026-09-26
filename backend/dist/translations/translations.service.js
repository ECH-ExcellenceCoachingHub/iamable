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
var TranslationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const translation_schema_1 = require("./schemas/translation.schema");
const translation_history_schema_1 = require("./schemas/translation-history.schema");
const saved_item_schema_1 = require("./schemas/saved-item.schema");
let TranslationsService = TranslationsService_1 = class TranslationsService {
    translationModel;
    historyModel;
    savedItemModel;
    logger = new common_1.Logger(TranslationsService_1.name);
    constructor(translationModel, historyModel, savedItemModel) {
        this.translationModel = translationModel;
        this.historyModel = historyModel;
        this.savedItemModel = savedItemModel;
    }
    async onModuleInit() {
        await this.saveLegacyTranslations().catch((err) => this.logger.error('Could not mark older translations as saved', err));
    }
    async saveLegacyTranslations() {
        const legacy = await this.translationModel
            .find({ autoRecorded: { $exists: false } })
            .select('_id userId createdAt')
            .lean();
        if (legacy.length === 0)
            return;
        await this.savedItemModel.bulkWrite(legacy.map((t) => ({
            updateOne: {
                filter: { userId: t.userId, translationId: t._id },
                update: { $setOnInsert: { userId: t.userId, translationId: t._id, savedAt: t.createdAt ?? new Date() } },
                upsert: true,
            },
        })));
        await this.translationModel.updateMany({ _id: { $in: legacy.map((t) => t._id) } }, { $set: { isSaved: true, autoRecorded: false } });
        this.logger.log(`Marked ${legacy.length} older translation(s) as saved`);
    }
    async create(userId, createTranslationDto) {
        const translation = await this.translationModel.create({
            userId: new mongoose_2.Types.ObjectId(userId),
            ...createTranslationDto,
            autoRecorded: true,
        });
        await this.historyModel.create({
            userId: new mongoose_2.Types.ObjectId(userId),
            translationId: translation._id,
        });
        return translation;
    }
    async findAll(userId) {
        return this.translationModel
            .find({ userId: new mongoose_2.Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .limit(50);
    }
    async findOne(id, userId) {
        const translation = await this.translationModel.findOne({
            _id: id,
            userId: new mongoose_2.Types.ObjectId(userId),
        });
        if (!translation) {
            throw new common_1.NotFoundException('Translation not found');
        }
        return translation;
    }
    async update(id, userId, dto) {
        const { inputContent, translatedText, confidenceScore } = dto;
        const changes = Object.fromEntries(Object.entries({ inputContent, translatedText, confidenceScore }).filter(([, value]) => value !== undefined));
        const translation = await this.translationModel.findOneAndUpdate({ _id: id, userId: new mongoose_2.Types.ObjectId(userId) }, { $set: changes }, { new: true });
        if (!translation) {
            throw new common_1.NotFoundException('Translation not found');
        }
        return translation;
    }
    async getHistory(userId, limit = 20) {
        return this.historyModel
            .find({ userId: new mongoose_2.Types.ObjectId(userId) })
            .populate('translationId')
            .sort({ timestamp: -1 })
            .limit(limit);
    }
    async getSavedItems(userId) {
        return this.savedItemModel
            .find({ userId: new mongoose_2.Types.ObjectId(userId) })
            .populate('translationId')
            .sort({ savedAt: -1 });
    }
    async saveItem(userId, translationId, notes) {
        await this.findOne(translationId, userId);
        const existing = await this.savedItemModel.findOne({
            userId: new mongoose_2.Types.ObjectId(userId),
            translationId: new mongoose_2.Types.ObjectId(translationId),
        });
        if (existing) {
            return existing;
        }
        const savedItem = await this.savedItemModel.create({
            userId: new mongoose_2.Types.ObjectId(userId),
            translationId: new mongoose_2.Types.ObjectId(translationId),
            notes,
        });
        await this.translationModel.findByIdAndUpdate(translationId, { isSaved: true });
        return savedItem;
    }
    async unsaveItem(userId, translationId) {
        await this.findOne(translationId, userId);
        await this.savedItemModel.deleteOne({
            userId: new mongoose_2.Types.ObjectId(userId),
            translationId: new mongoose_2.Types.ObjectId(translationId),
        });
        await this.translationModel.findByIdAndUpdate(translationId, { isSaved: false });
        return { message: 'Item removed from saved' };
    }
    async remove(id, userId) {
        const translation = await this.translationModel.findOneAndDelete({
            _id: id,
            userId: new mongoose_2.Types.ObjectId(userId),
        });
        if (!translation) {
            throw new common_1.NotFoundException('Translation not found');
        }
        await this.historyModel.deleteMany({ translationId: id });
        await this.savedItemModel.deleteMany({ translationId: id });
        return { message: 'Translation deleted' };
    }
    async getStats(userId) {
        const totalTranslations = await this.translationModel.countDocuments({
            userId: new mongoose_2.Types.ObjectId(userId),
        });
        const savedTranslations = await this.savedItemModel.countDocuments({
            userId: new mongoose_2.Types.ObjectId(userId),
        });
        const avgConfidence = await this.translationModel.aggregate([
            { $match: { userId: new mongoose_2.Types.ObjectId(userId) } },
            { $group: { _id: null, avgConfidence: { $avg: '$confidenceScore' } } },
        ]);
        return {
            totalTranslations,
            savedTranslations,
            avgConfidence: avgConfidence[0]?.avgConfidence || 0,
        };
    }
};
exports.TranslationsService = TranslationsService;
exports.TranslationsService = TranslationsService = TranslationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(translation_schema_1.Translation.name)),
    __param(1, (0, mongoose_1.InjectModel)(translation_history_schema_1.TranslationHistory.name)),
    __param(2, (0, mongoose_1.InjectModel)(saved_item_schema_1.SavedItem.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], TranslationsService);
