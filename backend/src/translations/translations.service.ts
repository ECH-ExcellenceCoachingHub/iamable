import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Translation, TranslationDocument } from './schemas/translation.schema';
import { TranslationHistory, TranslationHistoryDocument } from './schemas/translation-history.schema';
import { SavedItem, SavedItemDocument } from './schemas/saved-item.schema';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';

@Injectable()
export class TranslationsService implements OnModuleInit {
  private readonly logger = new Logger(TranslationsService.name);

  constructor(
    @InjectModel(Translation.name) private translationModel: Model<TranslationDocument>,
    @InjectModel(TranslationHistory.name) private historyModel: Model<TranslationHistoryDocument>,
    @InjectModel(SavedItem.name) private savedItemModel: Model<SavedItemDocument>,
  ) {}

  async onModuleInit() {
    await this.saveLegacyTranslations().catch((err) => this.logger.error('Could not mark older translations as saved', err));
  }

  /**
   * Before translations were recorded automatically, one was only stored when the user pressed
   * Save, but no saved item was created for it. Mark those as saved, once.
   */
  private async saveLegacyTranslations() {
    const legacy = await this.translationModel
      .find({ autoRecorded: { $exists: false } })
      .select('_id userId createdAt')
      .lean<{ _id: Types.ObjectId; userId: Types.ObjectId; createdAt?: Date }[]>();
    if (legacy.length === 0) return;

    await this.savedItemModel.bulkWrite(
      legacy.map((t) => ({
        updateOne: {
          filter: { userId: t.userId, translationId: t._id },
          update: { $setOnInsert: { userId: t.userId, translationId: t._id, savedAt: t.createdAt ?? new Date() } },
          upsert: true,
        },
      })),
    );
    await this.translationModel.updateMany(
      { _id: { $in: legacy.map((t) => t._id) } },
      { $set: { isSaved: true, autoRecorded: false } },
    );
    this.logger.log(`Marked ${legacy.length} older translation(s) as saved`);
  }

  async create(userId: string, createTranslationDto: CreateTranslationDto) {
    // Translations are created as the user translates; Save bookmarks them separately
    const translation = await this.translationModel.create({
      userId: new Types.ObjectId(userId),
      ...createTranslationDto,
      autoRecorded: true,
    });

    await this.historyModel.create({
      userId: new Types.ObjectId(userId),
      translationId: translation._id,
    });

    return translation;
  }

  async findAll(userId: string) {
    return this.translationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(50);
  }

  async findOne(id: string, userId: string) {
    const translation = await this.translationModel.findOne({
      _id: id,
      userId: new Types.ObjectId(userId),
    });
    if (!translation) {
      throw new NotFoundException('Translation not found');
    }
    return translation;
  }

  async update(id: string, userId: string, dto: UpdateTranslationDto) {
    const { inputContent, translatedText, confidenceScore } = dto;
    const changes = Object.fromEntries(
      Object.entries({ inputContent, translatedText, confidenceScore }).filter(([, value]) => value !== undefined),
    );
    const translation = await this.translationModel.findOneAndUpdate(
      { _id: id, userId: new Types.ObjectId(userId) },
      { $set: changes },
      { new: true },
    );
    if (!translation) {
      throw new NotFoundException('Translation not found');
    }
    return translation;
  }

  async getHistory(userId: string, limit: number = 20) {
    return this.historyModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('translationId')
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  async getSavedItems(userId: string) {
    return this.savedItemModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('translationId')
      .sort({ savedAt: -1 });
  }

  async saveItem(userId: string, translationId: string, notes?: string) {
    // Only the owner can save a translation (throws 404 otherwise)
    await this.findOne(translationId, userId);
    const existing = await this.savedItemModel.findOne({
      userId: new Types.ObjectId(userId),
      translationId: new Types.ObjectId(translationId),
    });

    if (existing) {
      return existing;
    }

    const savedItem = await this.savedItemModel.create({
      userId: new Types.ObjectId(userId),
      translationId: new Types.ObjectId(translationId),
      notes,
    });

    await this.translationModel.findByIdAndUpdate(translationId, { isSaved: true });

    return savedItem;
  }

  async unsaveItem(userId: string, translationId: string) {
    await this.findOne(translationId, userId);
    await this.savedItemModel.deleteOne({
      userId: new Types.ObjectId(userId),
      translationId: new Types.ObjectId(translationId),
    });

    await this.translationModel.findByIdAndUpdate(translationId, { isSaved: false });

    return { message: 'Item removed from saved' };
  }

  async remove(id: string, userId: string) {
    const translation = await this.translationModel.findOneAndDelete({
      _id: id,
      userId: new Types.ObjectId(userId),
    });

    if (!translation) {
      throw new NotFoundException('Translation not found');
    }

    await this.historyModel.deleteMany({ translationId: id });
    await this.savedItemModel.deleteMany({ translationId: id });

    return { message: 'Translation deleted' };
  }

  async getStats(userId: string) {
    const totalTranslations = await this.translationModel.countDocuments({
      userId: new Types.ObjectId(userId),
    });
    const savedTranslations = await this.savedItemModel.countDocuments({
      userId: new Types.ObjectId(userId),
    });
    const avgConfidence = await this.translationModel.aggregate([
      { $match: { userId: new Types.ObjectId(userId) } },
      { $group: { _id: null, avgConfidence: { $avg: '$confidenceScore' } } },
    ]);

    return {
      totalTranslations,
      savedTranslations,
      avgConfidence: avgConfidence[0]?.avgConfidence || 0,
    };
  }
}
