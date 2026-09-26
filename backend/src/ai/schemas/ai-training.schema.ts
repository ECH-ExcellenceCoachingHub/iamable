import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AITrainingDocument = AITraining & Document;

@Schema({ timestamps: true })
export class AITraining {
  @Prop({ required: true })
  trainingName: string;

  @Prop({ required: true })
  modelVersion: string;

  @Prop({
    required: true,
    enum: ['pending', 'training', 'completed', 'failed'],
    default: 'pending',
  })
  status: string;

  @Prop({ type: Object })
  trainingData: any;

  /** Samples used for this run (training + validation). */
  @Prop()
  datasetSize: number;

  @Prop()
  epochs: number;

  @Prop()
  batchSize: number;

  @Prop()
  learningRate: number;

  @Prop({ default: 64 })
  hiddenUnits: number;

  @Prop({ default: 0.2 })
  validationSplit: number;

  @Prop({ default: true })
  autoDeploy: boolean;

  @Prop({ default: 0 })
  currentEpoch: number;

  /** Per-epoch { epoch, loss, accuracy, valLoss, valAccuracy } for the live charts. */
  @Prop({ type: [Object], default: [] })
  history: any[];

  /** Training-set accuracy of the kept weights. */
  @Prop()
  accuracy: number;

  @Prop()
  valAccuracy: number;

  @Prop()
  loss: number;

  @Prop()
  valLoss: number;

  @Prop()
  bestEpoch: number;

  @Prop({ type: [String], default: [] })
  labels: string[];

  /** Labels left out because they had too few samples. */
  @Prop({ type: [String], default: [] })
  skippedLabels: string[];

  /** Milliseconds spent training. */
  @Prop()
  trainingTime: number;

  @Prop()
  startedAt: Date;

  @Prop()
  finishedAt: Date;

  @Prop()
  errorMessage: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  trainedBy: Types.ObjectId;

  /** { perClass, confusion, trainCount, valCount } */
  @Prop({ type: Object })
  modelMetrics: any;

  /** Network weights; excluded from list queries because it is large. */
  @Prop({ type: Object, select: false })
  model: any;

  /** The model the Sign to Text studio currently uses. At most one run is active. */
  /** Whether the model can tell "not a trained sign" apart (trained with the novelty check). */
  @Prop({ default: false })
  noveltyCheck: boolean;

  @Prop({ default: false, index: true })
  isActive: boolean;

  @Prop()
  deployedAt: Date;
}

export const AITrainingSchema = SchemaFactory.createForClass(AITraining);
