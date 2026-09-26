import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AILogDocument = AILog & Document;

@Schema({ timestamps: true })
export class AILog {
  @Prop({ required: true })
  modelVersion: string;

  @Prop({ type: Object })
  predictionData: any;

  /** Legacy field; older logs stored the confidence here. */
  @Prop({ default: 0 })
  accuracy: number;

  @Prop()
  processingTime: number;

  @Prop()
  gestureRecognized: string;

  @Prop()
  confidence: number;

  /** Where the prediction came from: 'sign-to-text', 'knowledge-check' or 'api'. */
  @Prop({ default: 'api', index: true })
  source: string;

  /** The sign that was really shown, when known (knowledge checks). */
  @Prop()
  expected: string;

  /** Whether the prediction matched `expected`; unset when the answer isn't known. */
  @Prop()
  correct: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;
}

export const AILogSchema = SchemaFactory.createForClass(AILog);
