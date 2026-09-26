import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { PushService } from './push.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    private pushService: PushService,
  ) {}

  /** Stores the notification and pushes it to the user's subscribed devices. */
  async create(createNotificationDto: CreateNotificationDto) {
    const notification = await new this.notificationModel({
      ...createNotificationDto,
      userId: String(createNotificationDto.userId),
    }).save();

    // Push delivery is best effort: the notification is already saved and shows in the app.
    this.push(notification).catch((err) =>
      this.logger.warn(`Could not push notification ${notification._id}: ${(err as Error).message}`),
    );
    return notification;
  }

  private async push(notification: NotificationDocument) {
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

  async findAll(userId: string) {
    return this.notificationModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findUnread(userId: string) {
    return this.notificationModel
      .find({ userId, read: false })
      .sort({ createdAt: -1 })
      .exec();
  }

  async markAsRead(id: string, userId: string) {
    if (!isValidObjectId(id)) throw new NotFoundException('Notification not found');
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: id, userId },
      { read: true },
      { new: true },
    );
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    return notification;
  }

  async markAllAsRead(userId: string) {
    return this.notificationModel.updateMany(
      { userId, read: false },
      { read: true },
    );
  }

  async remove(id: string, userId: string) {
    if (!isValidObjectId(id)) throw new NotFoundException('Notification not found');
    const notification = await this.notificationModel.findOneAndDelete({
      _id: id,
      userId,
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    return { message: 'Notification deleted successfully' };
  }

  async clearAll(userId: string) {
    await this.notificationModel.deleteMany({ userId });
    return { message: 'All notifications cleared' };
  }

  async getUnreadCount(userId: string) {
    return this.notificationModel.countDocuments({ userId, read: false });
  }
}
