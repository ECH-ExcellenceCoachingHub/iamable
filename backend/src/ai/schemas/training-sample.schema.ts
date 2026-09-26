import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TrainingSampleDocument = TrainingSample & Document;

/** One recorded clip of a sign (whole-body feature vector) labelled with the sign it shows. */
@Schema({ timestamps: true })
export class TrainingSample {
  @Prop({ required: true, trim: true, index: true })
  label: string;

  @Prop({ type: [Number], required: true })
  vector: number[];

  /** Which feature format `vector` uses; samples from other formats are ignored. */
  @Prop({ index: true })
  featureVersion: string;

  /** Clips cut from the same recording share this id (they are near-duplicates). */
  @Prop()
  recordingId: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;
}

export const TrainingSampleSchema =
  SchemaFactory.createForClass(TrainingSample);
