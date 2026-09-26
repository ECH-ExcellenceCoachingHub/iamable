import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Query,
  Param,
  Req,
  Delete,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateTrainingDto } from './dto/create-training.dto';
import { AddSamplesDto } from './dto/add-samples.dto';
import { LogPredictionDto } from './dto/log-prediction.dto';

// JwtAuthGuard must run before RolesGuard: it is what sets req.user. Without it every
// admin request was rejected with "Forbidden resource".
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('predict')
  async predict(@Body('gestureData') gestureData: any) {
    return this.aiService.processGesture(gestureData);
  }

  /** The deployed sign model, used by the Sign to Text studio. Null when none is deployed. */
  @Get('model/active')
  async getActiveModel() {
    return this.aiService.getActiveModel();
  }

  @Post('logs')
  async logPrediction(@Body() dto: LogPredictionDto, @Req() req) {
    await this.aiService.recordPrediction(dto, req.user?.id);
    return { ok: true };
  }

  @Get('logs')
  @Roles('admin')
  async getLogs(
    @Query('limit') limit?: number,
    @Query('source') source?: string,
  ) {
    return this.aiService.getLogs(limit, source);
  }

  @Get('stats')
  @Roles('admin')
  async getStats() {
    return this.aiService.getStats();
  }

  // ─── Dataset ────────────────────────────────────────────────────────────

  @Get('samples')
  @Roles('admin')
  async getDataset() {
    return this.aiService.getDatasetSummary();
  }

  @Post('samples')
  @Roles('admin')
  async addSamples(@Body() dto: AddSamplesDto, @Req() req) {
    return this.aiService.addSamples(dto, req.user.id);
  }

  @Delete('samples/:label')
  @Roles('admin')
  async deleteSign(@Param('label') label: string) {
    return this.aiService.deleteSign(label);
  }

  @Delete('samples/:label/latest')
  @Roles('admin')
  async undoLatestSamples(
    @Param('label') label: string,
    @Query('count') count: number,
  ) {
    return this.aiService.undoLatestSamples(label, count);
  }

  // ─── Training ───────────────────────────────────────────────────────────

  @Post('training')
  @Roles('admin')
  async createTraining(
    @Body() createTrainingDto: CreateTrainingDto,
    @Req() req,
  ) {
    return this.aiService.createTraining(createTrainingDto, req.user.id);
  }

  @Get('training')
  @Roles('admin')
  async getTrainingHistory() {
    return this.aiService.getTrainingHistory();
  }

  @Post('training/undeploy')
  @Roles('admin')
  async undeploy() {
    return this.aiService.undeployAll();
  }

  @Get('training/:id')
  @Roles('admin')
  async getTraining(@Param('id') id: string) {
    return this.aiService.getTraining(id);
  }

  @Get('training/:id/model')
  @Roles('admin')
  async getTrainingModel(@Param('id') id: string) {
    return this.aiService.getTrainingModel(id);
  }

  @Post('training/:id/deploy')
  @Roles('admin')
  async deployTraining(@Param('id') id: string) {
    return this.aiService.deployTraining(id);
  }

  @Delete('training/:id')
  @Roles('admin')
  async deleteTraining(@Param('id') id: string) {
    return this.aiService.deleteTraining(id);
  }
}
