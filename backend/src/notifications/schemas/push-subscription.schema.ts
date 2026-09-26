import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PushSubscriptionDocument = PushSubscription & Document;

/** A browser/device that has agreed to receive Web Push notifications for a user. */
@Schema({ timestamps: true })
export class PushSubscription {
  @Prop({ required: true, index: true })
  userId: string;

  // The endpoint identifies the device; if another account signs in there it is reassigned.
  @Prop({ required: true, unique: true })
  endpoint: string;

  @Prop({ type: { p256dh: String, auth: String }, required: true, _id: false })
  keys: { p256dh: string; auth: string };

  @Prop()
  userAgent?: string;
}

export const PushSubscriptionSchema = SchemaFactory.createForClass(PushSubscription);
