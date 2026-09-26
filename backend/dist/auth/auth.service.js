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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bcrypt = __importStar(require("bcrypt"));
const user_schema_1 = require("../users/schemas/user.schema");
let AuthService = class AuthService {
    userModel;
    jwtService;
    constructor(userModel, jwtService) {
        this.userModel = userModel;
        this.jwtService = jwtService;
    }
    async register(registerDto) {
        const { name, email, password } = registerDto;
        const existingUser = await this.userModel.findOne({ email });
        if (existingUser) {
            throw new common_1.ConflictException('Email already exists');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await this.userModel.create({
            name,
            email,
            password: hashedPassword,
            role: 'user',
        });
        const tokens = await this.generateTokens(user._id.toString(), user.role);
        await this.userModel.findByIdAndUpdate(user._id, {
            emailVerificationToken: this.generateVerificationToken(),
        });
        return {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            ...tokens,
        };
    }
    async login(loginDto) {
        const { email, password } = loginDto;
        const user = await this.userModel.findOne({ email });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const tokens = await this.generateTokens(user._id.toString(), user.role);
        return {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profileImage: user.profileImage,
                accessibilityPreferences: user.accessibilityPreferences,
            },
            ...tokens,
        };
    }
    async refreshTokens(refreshToken) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET,
            });
            const user = await this.userModel.findById(payload.sub);
            if (!user) {
                throw new common_1.UnauthorizedException('User not found');
            }
            const tokens = await this.generateTokens(user._id.toString(), user.role);
            return tokens;
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
    }
    async validateUser(userId) {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return user;
    }
    async generateTokens(userId, role) {
        const payload = { sub: userId, role };
        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d'),
        });
        return { accessToken, refreshToken };
    }
    generateVerificationToken() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
    async forgotPassword(email) {
        const user = await this.userModel.findOne({ email });
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        const resetToken = this.generateVerificationToken();
        const resetPasswordExpires = new Date(Date.now() + 3600000);
        await this.userModel.findByIdAndUpdate(user._id, {
            resetPasswordToken: resetToken,
            resetPasswordExpires,
        });
        return { message: 'Password reset email sent' };
    }
    async resetPassword(token, newPassword) {
        const user = await this.userModel.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        });
        if (!user) {
            throw new common_1.BadRequestException('Invalid or expired reset token');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.userModel.findByIdAndUpdate(user._id, {
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpires: null,
        });
        return { message: 'Password reset successful' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        jwt_1.JwtService])
], AuthService);
