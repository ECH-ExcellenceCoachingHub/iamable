import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Headers,
  ServiceUnavailableException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { PushSubscriptionDto, UnsubscribeDto } from './dto/push-subscription.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private pushService: PushService,
  ) {}

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

  // Sending a notification to an arbitrary user is an admin action.
  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Get('push/public-key')
  getPushPublicKey() {
    return { publicKey: this.pushService.getPublicKey(), enabled: this.pushService.enabled };
  }

  @Post('push/subscribe')
  async subscribe(@Request() req, @Body() dto: PushSubscriptionDto, @Headers('user-agent') userAgent?: string) {
    if (!this.pushService.enabled) {
      throw new ServiceUnavailableException('Push notifications are not configured on the server.');
    }
    return this.pushService.subscribe(req.user.id, dto, userAgent);
  }

  @Post('push/unsubscribe')
  async unsubscribe(@Request() req, @Body() dto: UnsubscribeDto) {
    return this.pushService.unsubscribe(req.user.id, dto.endpoint);
  }

  /** Creates a notification for the current user so they can check delivery end to end. */
  @Post('push/test')
  async sendTest(@Request() req) {
    if (!this.pushService.enabled) {
      throw new ServiceUnavailableException('Push notifications are not configured on the server.');
    }
    const devices = await this.pushService.countForUser(req.user.id);
    await this.notificationsService.create({
      userId: String(req.user.id),
      title: 'Test notification',
      message: 'Push notifications are working on this device.',
      type: 'success',
      link: '/dashboard/notifications',
    });
    return { devices };
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
