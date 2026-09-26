import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { TranslationsService } from './translations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTranslationDto } from './dto/create-translation.dto';
import { UpdateTranslationDto } from './dto/update-translation.dto';

@Controller('translations')
@UseGuards(JwtAuthGuard)
export class TranslationsController {
  constructor(private translationsService: TranslationsService) {}

  @Post()
  async create(@Request() req, @Body() createTranslationDto: CreateTranslationDto) {
    return this.translationsService.create(req.user.id, createTranslationDto);
  }

  @Get()
  async findAll(@Request() req) {
    return this.translationsService.findAll(req.user.id);
  }

  @Get('history')
  async getHistory(@Request() req, @Query('limit') limit?: number) {
    return this.translationsService.getHistory(req.user.id, limit);
  }

  @Get('saved')
  async getSavedItems(@Request() req) {
    return this.translationsService.getSavedItems(req.user.id);
  }

  @Get('stats')
  async getStats(@Request() req) {
    return this.translationsService.getStats(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.translationsService.findOne(id, req.user.id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Request() req, @Body() updateTranslationDto: UpdateTranslationDto) {
    return this.translationsService.update(id, req.user.id, updateTranslationDto);
  }

  @Post(':id/save')
  async saveItem(@Param('id') id: string, @Request() req, @Body('notes') notes?: string) {
    return this.translationsService.saveItem(req.user.id, id, notes);
  }

  @Delete(':id/save')
  async unsaveItem(@Param('id') id: string, @Request() req) {
    return this.translationsService.unsaveItem(req.user.id, id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    return this.translationsService.remove(id, req.user.id);
  }
}
