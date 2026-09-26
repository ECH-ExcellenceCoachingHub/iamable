"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PushService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const webpush = __importStar(require("web-push"));
const push_subscription_schema_1 = require("./schemas/push-subscription.schema");
let PushService = PushService_1 = class PushService {
    configService;
    subscriptionModel;
    logger = new common_1.Logger(PushService_1.name);
    publicKey = null;
    constructor(configService, subscriptionModel) {
        this.configService = configService;
        this.subscriptionModel = subscriptionModel;
    }
    onModuleInit() {
        const publicKey = this.configService.get('VAPID_PUBLIC_KEY');
        const privateKey = this.configService.get('VAPID_PRIVATE_KEY');
        const subject = this.configService.get('VAPID_SUBJECT', 'mailto:support@iamable.app');
        if (!publicKey || !privateKey) {
            this.logger.warn('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set: push notifications are disabled.');
            return;
        }
        try {
            webpush.setVapidDetails(subject, publicKey, privateKey);
            this.publicKey = publicKey;
        }
        catch (err) {
            this.logger.error(`Invalid VAPID configuration, push notifications are disabled: ${err.message}`);
        }
    }
    get enabled() {
        return this.publicKey !== null;
    }
    getPublicKey() {
        return this.publicKey;
    }
    async subscribe(userId, dto, userAgent) {
        await this.subscriptionModel.findOneAndUpdate({ endpoint: dto.endpoint }, { userId: String(userId), endpoint: dto.endpoint, keys: dto.keys, userAgent }, { upsert: true, new: true, setDefaultsOnInsert: true });
        return { subscribed: true };
    }
    async unsubscribe(userId, endpoint) {
        await this.subscriptionModel.deleteOne({ userId: String(userId), endpoint });
        return { subscribed: false };
    }
    async countForUser(userId) {
        return this.subscriptionModel.countDocuments({ userId: String(userId) });
    }
    async sendToUser(userId, payload) {
        if (!this.enabled)
            return 0;
        const subscriptions = await this.subscriptionModel.find({ userId: String(userId) }).lean();
        if (subscriptions.length === 0)
            return 0;
        const body = JSON.stringify(payload);
        const results = await Promise.all(subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, body, {
                    TTL: 60 * 60 * 24,
                    urgency: payload.type === 'error' || payload.type === 'warning' ? 'high' : 'normal',
                    topic: payload.tag?.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) || undefined,
                });
                return true;
            }
            catch (err) {
                const statusCode = err.statusCode;
                if (statusCode === 404 || statusCode === 410) {
                    await this.subscriptionModel.deleteOne({ _id: sub._id });
                }
                else {
                    this.logger.warn(`Push to ${new URL(sub.endpoint).host} failed (${statusCode ?? 'network'}): ${err.message}`);
                }
                return false;
            }
        }));
        return results.filter(Boolean).length;
    }
};
exports.PushService = PushService;
exports.PushService = PushService = PushService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, mongoose_1.InjectModel)(push_subscription_schema_1.PushSubscription.name)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        mongoose_2.Model])
], PushService);
