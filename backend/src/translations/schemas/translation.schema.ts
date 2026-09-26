import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TranslationDocument = Translation & Document;

@Schema({ timestamps: true })
export class Translation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ['sign-to-text', 'text-to-sign', 'voice-to-sign'] })
  inputType: string;

  @Prop({ required: true })
  inputContent: string;

  @Prop({ required: true })
  translatedText: string;

  @Prop({ default: 0 })
  confidenceScore: number;

  @Prop({ type: Object })
  gestureData: any;

  @Prop({ default: false })
  isSaved: boolean;

  /**
   * True for translations recorded automatically as the user translates. Older translations
   * lack it: back then a translation was only stored when the user pressed Save.
   */
  @Prop()
  autoRecorded?: boolean;
}

export const TranslationSchema = SchemaFactory.createForClass(Translation);
