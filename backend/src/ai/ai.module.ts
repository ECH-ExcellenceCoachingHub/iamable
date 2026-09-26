import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AILog, AILogSchema } from './schemas/ai-log.schema';
import { AITraining, AITrainingSchema } from './schemas/ai-training.schema';
import {
  TrainingSample,
  TrainingSampleSchema,
} from './schemas/training-sample.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AILog.name, schema: AILogSchema },
      { name: AITraining.name, schema: AITrainingSchema },
      { name: TrainingSample.name, schema: TrainingSampleSchema },
    ]),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
