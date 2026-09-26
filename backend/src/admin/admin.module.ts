import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { SystemMetricsController } from './controllers/system-metrics.controller';
import { AdminService } from './admin.service';
import { Report, ReportSchema } from './schemas/report.schema';
import { SystemMetric, SystemMetricSchema } from './schemas/system-metric.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
      { name: SystemMetric.name, schema: SystemMetricSchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [AdminController, SystemMetricsController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
