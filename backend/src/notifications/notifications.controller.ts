import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async findAll(@Request() req) {
    return this.notificationsService.findAll(req.user.id);
  }

  @Get('unread')
  async findUnread(@Request() req) {
    return this.notificationsService.findUnread(req.user.id);
  }

  @Get('count')
  async getUnreadCount(@Request() req) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { count };
  }

  @Post()
  async create(@Body() createNotificationDto: any) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Put(':id/read')
  async markAsRead(@Param('id') id: string, @Request() req) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Put('read-all')
  async markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  // Must be declared before ':id' so 'clear-all' isn't captured as an id
  @Delete('clear-all')
  async clearAll(@Request() req) {
    return this.notificationsService.clearAll(req.user.id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    return this.notificationsService.remove(id, req.user.id);
  }
}
