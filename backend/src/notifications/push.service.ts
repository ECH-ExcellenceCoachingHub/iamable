import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as webpush from 'web-push';
import { PushSubscription, PushSubscriptionDocument } from './schemas/push-subscription.schema';
import { PushSubscriptionDto } from './dto/push-subscription.dto';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  type?: string;
  badgeCount?: number;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private publicKey: string | null = null;

  constructor(
    private configService: ConfigService,
    @InjectModel(PushSubscription.name)
    private subscriptionModel: Model<PushSubscriptionDocument>,
  ) {}

  onModuleInit() {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.configService.get<string>('VAPID_SUBJECT', 'mailto:support@iamable.app');
    if (!publicKey || !privateKey) {
      this.logger.warn('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set: push notifications are disabled.');
      return;
    }
    try {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.publicKey = publicKey;
    } catch (err) {
      this.logger.error(`Invalid VAPID configuration, push notifications are disabled: ${(err as Error).message}`);
    }
  }

  get enabled() {
    return this.publicKey !== null;
  }

  getPublicKey() {
    return this.publicKey;
  }

  async subscribe(userId: string, dto: PushSubscriptionDto, userAgent?: string) {
    await this.subscriptionModel.findOneAndUpdate(
      { endpoint: dto.endpoint },
      { userId: String(userId), endpoint: dto.endpoint, keys: dto.keys, userAgent },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return { subscribed: true };
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.subscriptionModel.deleteOne({ userId: String(userId), endpoint });
    return { subscribed: false };
  }

  async countForUser(userId: string) {
    return this.subscriptionModel.countDocuments({ userId: String(userId) });
  }

  /** Sends to every device the user subscribed. Returns how many deliveries the push services accepted. */
  async sendToUser(userId: string, payload: PushPayload): Promise<number> {
    if (!this.enabled) return 0;
    const subscriptions = await this.subscriptionModel.find({ userId: String(userId) }).lean();
    if (subscriptions.length === 0) return 0;

    const body = JSON.stringify(payload);
    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, body, {
            TTL: 60 * 60 * 24,
            urgency: payload.type === 'error' || payload.type === 'warning' ? 'high' : 'normal',
            topic: payload.tag?.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) || undefined,
          });
          return true;
        } catch (err) {
          const statusCode = (err as webpush.WebPushError).statusCode;
          // 404/410: the browser unsubscribed or the subscription expired, so forget it.
          if (statusCode === 404 || statusCode === 410) {
            await this.subscriptionModel.deleteOne({ _id: sub._id });
          } else {
            this.logger.warn(`Push to ${new URL(sub.endpoint).host} failed (${statusCode ?? 'network'}): ${(err as Error).message}`);
          }
          return false;
        }
      }),
    );
    return results.filter(Boolean).length;
  }
}
