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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const notification_schema_1 = require("./schemas/notification.schema");
const push_service_1 = require("./push.service");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    notificationModel;
    pushService;
    logger = new common_1.Logger(NotificationsService_1.name);
    constructor(notificationModel, pushService) {
        this.notificationModel = notificationModel;
        this.pushService = pushService;
    }
    async create(createNotificationDto) {
        const notification = await new this.notificationModel({
            ...createNotificationDto,
            userId: String(createNotificationDto.userId),
        }).save();
        this.push(notification).catch((err) => this.logger.warn(`Could not push notification ${notification._id}: ${err.message}`));
        return notification;
    }
    async push(notification) {
        const badgeCount = await this.getUnreadCount(notification.userId);
        await this.pushService.sendToUser(notification.userId, {
            title: notification.title,
            body: notification.message,
            type: notification.type,
            url: notification.link || '/dashboard/notifications',
            tag: String(notification._id),
            badgeCount,
        });
    }
    async findAll(userId) {
        return this.notificationModel
            .find({ userId })
            .sort({ createdAt: -1 })
            .exec();
    }
    async findUnread(userId) {
        return this.notificationModel
            .find({ userId, read: false })
            .sort({ createdAt: -1 })
            .exec();
    }
    async markAsRead(id, userId) {
        if (!(0, mongoose_2.isValidObjectId)(id))
            throw new common_1.NotFoundException('Notification not found');
        const notification = await this.notificationModel.findOneAndUpdate({ _id: id, userId }, { read: true }, { new: true });
        if (!notification) {
            throw new common_1.NotFoundException('Notification not found');
        }
        return notification;
    }
    async markAllAsRead(userId) {
        return this.notificationModel.updateMany({ userId, read: false }, { read: true });
    }
    async remove(id, userId) {
        if (!(0, mongoose_2.isValidObjectId)(id))
            throw new common_1.NotFoundException('Notification not found');
        const notification = await this.notificationModel.findOneAndDelete({
            _id: id,
            userId,
        });
        if (!notification) {
            throw new common_1.NotFoundException('Notification not found');
        }
        return { message: 'Notification deleted successfully' };
    }
    async clearAll(userId) {
        await this.notificationModel.deleteMany({ userId });
        return { message: 'All notifications cleared' };
    }
    async getUnreadCount(userId) {
        return this.notificationModel.countDocuments({ userId, read: false });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(notification_schema_1.Notification.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        push_service_1.PushService])
], NotificationsService);
