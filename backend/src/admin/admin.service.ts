import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Report, ReportDocument } from './schemas/report.schema';
import { SystemMetric, SystemMetricDocument } from './schemas/system-metric.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Report.name) private reportModel: Model<ReportDocument>,
    @InjectModel(SystemMetric.name) private systemMetricModel: Model<SystemMetricDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async createReport(userId: string, createReportDto: CreateReportDto) {
    return this.reportModel.create({
      userId: new Types.ObjectId(userId),
      ...createReportDto,
    });
  }

  async findAll() {
    return this.reportModel.find().sort({ createdAt: -1 });
  }

  async findOne(id: string) {
    const report = await this.reportModel.findById(id);
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    return report;
  }

  async updateStatus(id: string, status: string, adminResponse?: string) {
    const report = await this.reportModel.findByIdAndUpdate(
      id,
      { status, adminResponse },
      { new: true },
    );

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  async getStats() {
    const totalReports = await this.reportModel.countDocuments();
    const pendingReports = await this.reportModel.countDocuments({ status: 'pending' });
    const resolvedReports = await this.reportModel.countDocuments({ status: 'resolved' });

    const reportTypeDistribution = await this.reportModel.aggregate([
      { $group: { _id: '$reportType', count: { $sum: 1 } } },
    ]);

    return {
      totalReports,
      pendingReports,
      resolvedReports,
      reportTypeDistribution,
    };
  }

  async logSystemMetric(metricData: any) {
    return this.systemMetricModel.create({
      ...metricData,
      metricType: metricData.metricType || 'general',
    });
  }

  async getSystemMetrics(limit: number = 100, type?: string) {
    const query = type ? { metricType: type } : {};
    return this.systemMetricModel.find(query).sort({ createdAt: -1 }).limit(limit);
  }

  async getDashboardStats() {
    const totalUsers = await this.userModel.countDocuments();
    const activeUsers = await this.userModel.countDocuments({ isEmailVerified: true });
    const adminUsers = await this.userModel.countDocuments({ role: 'admin' });

    const recentMetrics = await this.systemMetricModel
      .find()
      .sort({ createdAt: -1 })
      .limit(1);

    const systemStats = recentMetrics[0] || {
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      activeUsers: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      uptime: 0,
    };

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        admins: adminUsers,
      },
      system: systemStats,
    };
  }

  async getAllUsers(page: number = 1, limit: number = 10, search?: string) {
    // Escape user input so it is matched literally, not as a regular expression
    const pattern = search?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const query = pattern ? { $or: [{ name: { $regex: pattern, $options: 'i' } }, { email: { $regex: pattern, $options: 'i' } }] } : {};
    const skip = (page - 1) * limit;

    const users = await this.userModel
      .find(query)
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });
    const total = await this.userModel.countDocuments(query);
    
    return { users, total, page, limit };
  }

  async getUserById(id: string) {
    const user = await this.userModel.findById(id).select('-password');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateUserRole(id: string, role: string) {
    const user = await this.userModel.findByIdAndUpdate(id, { role }, { new: true }).select('-password');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async deleteUser(id: string) {
    const user = await this.userModel.findByIdAndDelete(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { message: 'User deleted successfully' };
  }
}
