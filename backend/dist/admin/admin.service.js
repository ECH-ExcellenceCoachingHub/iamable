"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const report_schema_1 = require("./schemas/report.schema");
const system_metric_schema_1 = require("./schemas/system-metric.schema");
const user_schema_1 = require("../users/schemas/user.schema");
const notifications_service_1 = require("../notifications/notifications.service");
let AdminService = class AdminService {
    reportModel;
    systemMetricModel;
    userModel;
    notificationsService;
    constructor(reportModel, systemMetricModel, userModel, notificationsService) {
        this.reportModel = reportModel;
        this.systemMetricModel = systemMetricModel;
        this.userModel = userModel;
        this.notificationsService = notificationsService;
    }
    async createReport(userId, createReportDto) {
        const report = await this.reportModel.create({
            userId: new mongoose_2.Types.ObjectId(userId),
            ...createReportDto,
        });
        const admins = await this.userModel.find({ role: 'admin' }, { _id: 1 }).lean();
        await Promise.all(admins.map((admin) => this.notificationsService
            .create({
            userId: admin._id.toString(),
            title: 'New report submitted',
            message: `A new ${report.reportType.replace('-', ' ')} report is waiting for review.`,
            type: 'warning',
            link: '/admin/reports',
        })
            .catch(() => undefined)));
        return report;
    }
    async findAll() {
        return this.reportModel.find().sort({ createdAt: -1 });
    }
    async findOne(id) {
        const report = await this.reportModel.findById(id);
        if (!report) {
            throw new common_1.NotFoundException('Report not found');
        }
        return report;
    }
    async updateStatus(id, status, adminResponse) {
        const report = await this.reportModel.findByIdAndUpdate(id, { status, adminResponse }, { new: true });
        if (!report) {
            throw new common_1.NotFoundException('Report not found');
        }
        if (report.userId) {
            await this.notificationsService
                .create({
                userId: report.userId.toString(),
                title: 'Your report was updated',
                message: adminResponse
                    ? `Status: ${status}. ${adminResponse}`
                    : `Your ${report.reportType.replace('-', ' ')} report is now ${status}.`,
                type: status === 'resolved' ? 'success' : 'info',
            })
                .catch(() => undefined);
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
    async logSystemMetric(metricData) {
        return this.systemMetricModel.create({
            ...metricData,
            metricType: metricData.metricType || 'general',
        });
    }
    async getSystemMetrics(limit = 100, type) {
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
    async getAllUsers(page = 1, limit = 10, search) {
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
    async getUserById(id) {
        const user = await this.userModel.findById(id).select('-password');
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async updateUserRole(id, role) {
        const user = await this.userModel.findByIdAndUpdate(id, { role }, { new: true }).select('-password');
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async deleteUser(id) {
        const user = await this.userModel.findByIdAndDelete(id);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return { message: 'User deleted successfully' };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(report_schema_1.Report.name)),
    __param(1, (0, mongoose_1.InjectModel)(system_metric_schema_1.SystemMetric.name)),
    __param(2, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        notifications_service_1.NotificationsService])
], AdminService);
