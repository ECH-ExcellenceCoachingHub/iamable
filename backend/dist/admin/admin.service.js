"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const bcrypt = __importStar(require("bcrypt"));
const report_schema_1 = require("./schemas/report.schema");
const system_metric_schema_1 = require("./schemas/system-metric.schema");
const user_schema_1 = require("../users/schemas/user.schema");
const notifications_service_1 = require("../notifications/notifications.service");
const SAFE_USER_FIELDS = '-password -emailVerificationToken -resetPasswordToken -resetPasswordExpires';
let AdminService = class AdminService {
    reportModel;
    systemMetricModel;
    userModel;
    connection;
    notificationsService;
    constructor(reportModel, systemMetricModel, userModel, connection, notificationsService) {
        this.reportModel = reportModel;
        this.systemMetricModel = systemMetricModel;
        this.userModel = userModel;
        this.connection = connection;
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
    buildUserQuery(filters) {
        const query = {};
        const pattern = filters.search?.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (pattern) {
            query.$or = [{ name: { $regex: pattern, $options: 'i' } }, { email: { $regex: pattern, $options: 'i' } }];
        }
        if (filters.role)
            query.role = filters.role;
        if (filters.status === 'active')
            query.isActive = { $ne: false };
        if (filters.status === 'suspended')
            query.isActive = false;
        if (filters.verified === 'verified')
            query.isEmailVerified = true;
        if (filters.verified === 'unverified')
            query.isEmailVerified = { $ne: true };
        return query;
    }
    async getAllUsers(params) {
        const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = params;
        const query = this.buildUserQuery(params);
        const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
        if (sortBy !== 'createdAt')
            sort.createdAt = -1;
        const [users, total] = await Promise.all([
            this.userModel
                .find(query)
                .select(SAFE_USER_FIELDS)
                .sort(sort)
                .skip((page - 1) * limit)
                .limit(limit),
            this.userModel.countDocuments(query),
        ]);
        return { users, total, page, limit };
    }
    async exportUsers(params) {
        return this.userModel
            .find(this.buildUserQuery(params))
            .select('name email role isActive isEmailVerified lastLoginAt createdAt')
            .sort({ createdAt: -1 })
            .limit(10000)
            .lean();
    }
    async getUserStats() {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const [total, admins, suspended, verified, newLast30Days, activeLast30Days] = await Promise.all([
            this.userModel.countDocuments(),
            this.userModel.countDocuments({ role: 'admin' }),
            this.userModel.countDocuments({ isActive: false }),
            this.userModel.countDocuments({ isEmailVerified: true }),
            this.userModel.countDocuments({ createdAt: { $gte: since } }),
            this.userModel.countDocuments({ lastLoginAt: { $gte: since } }),
        ]);
        return { total, admins, suspended, verified, newLast30Days, activeLast30Days };
    }
    async getUserById(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id))
            throw new common_1.NotFoundException('User not found');
        const user = await this.userModel.findById(id).select(SAFE_USER_FIELDS).lean();
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const objectId = new mongoose_2.Types.ObjectId(id);
        const count = (modelName) => {
            const model = this.connection.models[modelName];
            return model ? model.countDocuments({ userId: objectId }).catch(() => 0) : Promise.resolve(0);
        };
        const [translations, savedItems, reports] = await Promise.all([
            count('Translation'),
            count('SavedItem'),
            this.reportModel.countDocuments({ userId: objectId }),
        ]);
        return { ...user, activity: { translations, savedItems, reports } };
    }
    async createUser(dto) {
        const email = dto.email.trim().toLowerCase();
        if (await this.userModel.exists({ email })) {
            throw new common_1.ConflictException('A user with this email already exists');
        }
        const user = await this.userModel.create({
            name: dto.name.trim(),
            email,
            password: await bcrypt.hash(dto.password, 10),
            role: dto.role ?? 'user',
            isEmailVerified: dto.isEmailVerified ?? false,
            isActive: true,
        });
        await this.notificationsService
            .create({
            userId: user._id.toString(),
            title: `Welcome to Am Able, ${user.name.split(' ')[0]}!`,
            message: 'An administrator created your account. You can update your profile and password in settings.',
            type: 'info',
            link: '/dashboard',
        })
            .catch(() => undefined);
        return this.getUserById(user._id.toString());
    }
    async updateUser(actorId, id, dto, suspendedReason) {
        const user = await this.findUserOrFail(id);
        const isSelf = user._id.toString() === actorId;
        const set = {};
        const unset = {};
        if (dto.name !== undefined)
            set.name = dto.name.trim();
        if (dto.email !== undefined) {
            const email = dto.email.trim().toLowerCase();
            if (email !== user.email) {
                if (await this.userModel.exists({ email, _id: { $ne: user._id } })) {
                    throw new common_1.ConflictException('A user with this email already exists');
                }
                set.email = email;
            }
        }
        if (dto.role !== undefined && dto.role !== user.role) {
            if (isSelf)
                throw new common_1.ForbiddenException("You can't change your own role");
            if (user.role === 'admin')
                await this.assertNotLastAdmin();
            set.role = dto.role;
        }
        const wasActive = user.isActive !== false;
        if (dto.isActive !== undefined && dto.isActive !== wasActive) {
            if (isSelf)
                throw new common_1.ForbiddenException("You can't suspend your own account");
            if (!dto.isActive && user.role === 'admin')
                await this.assertNotLastAdmin();
            set.isActive = dto.isActive;
        }
        if (dto.isActive === true)
            unset.suspendedReason = 1;
        if (dto.isActive === false && suspendedReason?.trim())
            set.suspendedReason = suspendedReason.trim();
        if (dto.isEmailVerified !== undefined)
            set.isEmailVerified = dto.isEmailVerified;
        if (dto.profileImage !== undefined)
            set.profileImage = dto.profileImage;
        await this.userModel.updateOne({ _id: user._id }, { $set: set, $unset: unset }, { runValidators: true });
        if (set.isActive === false) {
            await this.notifyUser(user._id, 'Your account was suspended', suspendedReason?.trim() || 'Contact support for more information.', 'warning');
        }
        else if (set.role) {
            await this.notifyUser(user._id, 'Your role changed', `You are now ${set.role === 'admin' ? 'an admin' : 'a standard user'}.`, 'info');
        }
        return this.getUserById(id);
    }
    async updateUserRole(actorId, id, role) {
        return this.updateUser(actorId, id, { role });
    }
    async updateUserStatus(actorId, id, isActive, reason) {
        return this.updateUser(actorId, id, { isActive }, reason);
    }
    async resetUserPassword(id, password) {
        const user = await this.findUserOrFail(id);
        await this.userModel.updateOne({ _id: user._id }, { $set: { password: await bcrypt.hash(password, 10) }, $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 } });
        await this.notifyUser(user._id, 'Your password was reset', 'An administrator reset your password. If you did not expect this, contact support.', 'warning');
        return { message: 'Password reset successfully' };
    }
    async deleteUser(actorId, id) {
        const user = await this.findUserOrFail(id);
        if (user._id.toString() === actorId) {
            throw new common_1.ForbiddenException("You can't delete your own account");
        }
        if (user.role === 'admin')
            await this.assertNotLastAdmin();
        await this.userModel.deleteOne({ _id: user._id });
        await this.removeUserData(user._id);
        return { message: 'User deleted successfully' };
    }
    async bulkUserAction(actorId, dto) {
        const ids = [...new Set(dto.ids)].filter((id) => id !== actorId);
        if (ids.length === 0) {
            throw new common_1.BadRequestException("You can't apply bulk actions to your own account");
        }
        const objectIds = ids.map((id) => new mongoose_2.Types.ObjectId(id));
        const scope = { _id: { $in: objectIds } };
        if (dto.action === 'delete' || dto.action === 'suspend' || dto.action === 'make-user') {
            const remainingAdmins = await this.userModel.countDocuments({
                role: 'admin',
                isActive: { $ne: false },
                _id: { $nin: objectIds },
            });
            if (remainingAdmins === 0) {
                throw new common_1.BadRequestException('At least one active admin must remain');
            }
        }
        let affected = 0;
        switch (dto.action) {
            case 'activate':
                affected = (await this.userModel.updateMany(scope, { $set: { isActive: true }, $unset: { suspendedReason: 1 } })).modifiedCount;
                break;
            case 'suspend':
                affected = (await this.userModel.updateMany(scope, { $set: { isActive: false } })).modifiedCount;
                break;
            case 'make-admin':
                affected = (await this.userModel.updateMany(scope, { $set: { role: 'admin' } })).modifiedCount;
                break;
            case 'make-user':
                affected = (await this.userModel.updateMany(scope, { $set: { role: 'user' } })).modifiedCount;
                break;
            case 'verify':
                affected = (await this.userModel.updateMany(scope, { $set: { isEmailVerified: true } })).modifiedCount;
                break;
            case 'delete':
                affected = (await this.userModel.deleteMany(scope)).deletedCount;
                await Promise.all(objectIds.map((objectId) => this.removeUserData(objectId)));
                break;
        }
        return { action: dto.action, affected, skippedSelf: ids.length !== dto.ids.length };
    }
    async findUserOrFail(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id))
            throw new common_1.NotFoundException('User not found');
        const user = await this.userModel.findById(id);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async assertNotLastAdmin() {
        const activeAdmins = await this.userModel.countDocuments({ role: 'admin', isActive: { $ne: false } });
        if (activeAdmins <= 1) {
            throw new common_1.BadRequestException('At least one active admin must remain');
        }
    }
    async notifyUser(userId, title, message, type) {
        await this.notificationsService.create({ userId: userId.toString(), title, message, type }).catch(() => undefined);
    }
    async removeUserData(userId) {
        const byObjectId = ['Translation', 'TranslationHistory', 'SavedItem'];
        const byString = ['Notification', 'PushSubscription'];
        await Promise.all([
            ...byObjectId.map((name) => this.connection.models[name]?.deleteMany({ userId }).catch(() => undefined)),
            ...byString.map((name) => this.connection.models[name]?.deleteMany({ userId: userId.toString() }).catch(() => undefined)),
        ]);
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(report_schema_1.Report.name)),
    __param(1, (0, mongoose_1.InjectModel)(system_metric_schema_1.SystemMetric.name)),
    __param(2, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(3, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Connection,
        notifications_service_1.NotificationsService])
], AdminService);
