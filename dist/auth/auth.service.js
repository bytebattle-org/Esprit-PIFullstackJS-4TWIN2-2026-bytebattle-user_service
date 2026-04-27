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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bcrypt = __importStar(require("bcrypt"));
const user_schema_1 = require("../users/schemas/user.schema");
const email_service_1 = require("../email/email.service");
const rabbitmq_service_1 = require("../rabbitmq/rabbitmq.service");
let AuthService = AuthService_1 = class AuthService {
    userModel;
    jwtService;
    configService;
    emailService;
    rabbitMQService;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(userModel, jwtService, configService, emailService, rabbitMQService) {
        this.userModel = userModel;
        this.jwtService = jwtService;
        this.configService = configService;
        this.emailService = emailService;
        this.rabbitMQService = rabbitMQService;
    }
    async validateUser(email, password) {
        const user = await this.userModel.findOne({ email });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.isEmailVerified) {
            throw new common_1.BadRequestException('Please verify your email first');
        }
        if (user.isBanned) {
            throw new common_1.ForbiddenException('Your account has been banned. Please contact support.');
        }
        const { passwordHash, refreshToken, ...result } = user.toObject();
        return result;
    }
    async login(user) {
        if (user.isTwoFactorEnabled) {
            return {
                requiresTwoFactor: true,
                userId: user._id.toString(),
                message: 'Please enter your 2FA code',
            };
        }
        await this.rabbitMQService.emitUserLoggedIn({
            userId: user._id.toString(),
            username: user.username,
            email: user.email,
        });
        this.logger.log(`📢 User logged in event emitted for ${user.username}`);
        return this.generateTokens(user);
    }
    async loginWith2FA(userId) {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        if (user.isBanned) {
            throw new common_1.ForbiddenException('Your account has been banned. Please contact support.');
        }
        return this.generateTokens(user);
    }
    async loginWithOAuth(user) {
        return this.generateTokens(user);
    }
    async generateTokens(user) {
        const payload = {
            email: user.email,
            sub: user._id,
            username: user.username,
            role: user.role
        };
        const accessToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_SECRET'),
            expiresIn: '15m',
        });
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_REFRESH_SECRET'),
            expiresIn: '7d',
        });
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        await this.userModel.findByIdAndUpdate(user._id, {
            refreshToken: hashedRefreshToken,
        });
        return {
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                profile: user.profile,
                statistics: user.statistics,
            },
        };
    }
    async refreshTokens(userId, refreshToken) {
        const user = await this.userModel.findById(userId);
        if (!user || !user.refreshToken) {
            throw new common_1.UnauthorizedException('Access denied');
        }
        if (user.isBanned) {
            throw new common_1.ForbiddenException('Your account has been banned. Please contact support.');
        }
        const refreshTokenMatches = await bcrypt.compare(refreshToken, user.refreshToken);
        if (!refreshTokenMatches) {
            throw new common_1.UnauthorizedException('Access denied');
        }
        const payload = {
            email: user.email,
            sub: user._id,
            username: user.username,
            role: user.role,
        };
        const newAccessToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_SECRET'),
            expiresIn: '15m',
        });
        const newRefreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get('JWT_REFRESH_SECRET'),
            expiresIn: '7d',
        });
        const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
        await this.userModel.findByIdAndUpdate(userId, {
            refreshToken: hashedRefreshToken,
        });
        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        };
    }
    async logout(userId) {
        await this.userModel.findByIdAndUpdate(userId, {
            refreshToken: undefined,
        });
        return { message: 'Logged out successfully' };
    }
    async forgotPassword(email) {
        const user = await this.userModel.findOne({ email });
        if (!user) {
            throw new common_1.BadRequestException('No account found with this email address');
        }
        const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedToken = await bcrypt.hash(resetToken, 10);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);
        user.passwordResetToken = hashedToken;
        user.passwordResetExpires = expiresAt;
        await user.save();
        try {
            await this.emailService.sendPasswordResetEmail(email, resetToken, user.username);
        }
        catch (error) {
            console.error('Failed to send password reset email:', error);
        }
        if (this.configService.get('NODE_ENV') === 'development') {
            return {
                message: 'Password reset code sent to your email',
                resetToken,
            };
        }
        return { message: 'Password reset code sent to your email' };
    }
    async resetPassword(token, newPassword) {
        const users = await this.userModel.find({
            passwordResetExpires: { $gt: new Date() },
        });
        const now = new Date();
        let matchedUser = null;
        for (const user of users) {
            if (!user.passwordResetToken || !user.passwordResetExpires || user.passwordResetExpires <= now) {
                continue;
            }
            const isTokenValid = await bcrypt.compare(token, user.passwordResetToken);
            if (isTokenValid) {
                matchedUser = user;
                break;
            }
        }
        if (!matchedUser) {
            throw new common_1.BadRequestException('Invalid or expired reset token');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        matchedUser.passwordHash = hashedPassword;
        matchedUser.passwordResetToken = undefined;
        matchedUser.passwordResetExpires = undefined;
        matchedUser.refreshToken = undefined;
        await matchedUser.save();
        return { message: 'Password has been reset successfully' };
    }
    async verifyResetToken(token) {
        const users = await this.userModel.find({
            passwordResetExpires: { $gt: new Date() },
        });
        const now = new Date();
        for (const user of users) {
            if (!user.passwordResetToken || !user.passwordResetExpires || user.passwordResetExpires <= now) {
                continue;
            }
            const isTokenValid = await bcrypt.compare(token, user.passwordResetToken);
            if (isTokenValid) {
                return { valid: true, email: user.email };
            }
        }
        return { valid: false };
    }
    async validateOAuthUser(profile) {
        const { email, providerId, provider, username, avatar } = profile;
        let user = await this.userModel.findOne({
            providerId,
            provider,
        });
        let isNewUser = false;
        if (user) {
            user.updatedAt = new Date();
            if (avatar && !user.profile.avatar) {
                user.profile.avatar = avatar;
            }
            await user.save();
        }
        else {
            const existingUser = await this.userModel.findOne({ email });
            if (existingUser) {
                existingUser.providerId = providerId;
                existingUser.provider = provider;
                if (avatar && !existingUser.profile.avatar) {
                    existingUser.profile.avatar = avatar;
                }
                await existingUser.save();
                user = existingUser;
            }
            else {
                isNewUser = true;
                user = new this.userModel({
                    email,
                    username: await this.generateUniqueUsername(username),
                    providerId,
                    provider,
                    providerAvatar: avatar,
                    isEmailVerified: true,
                    profile: {
                        avatar: avatar,
                    },
                    statistics: {
                        totalPoints: 0,
                        level: 1,
                        currentStreak: 0,
                        xp: 0,
                        challengesCompleted: 0,
                        challengesAttempted: 0,
                        successRate: 0,
                        totalTimeCoding: 0,
                    },
                    achievements: [],
                    badges: [],
                });
                await user.save();
                await this.rabbitMQService.emitUserCreated({
                    userId: user._id.toString(),
                    username: user.username,
                    email: user.email,
                    provider,
                });
                this.logger.log(`📢 User created event emitted for ${user.username} (OAuth)`);
            }
        }
        const { passwordHash, refreshToken, ...result } = user.toObject();
        return result;
    }
    async generateUniqueUsername(baseUsername) {
        let username = baseUsername;
        let counter = 1;
        while (await this.userModel.findOne({ username })) {
            username = `${baseUsername}${counter}`;
            counter++;
        }
        return username;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        jwt_1.JwtService,
        config_1.ConfigService,
        email_service_1.EmailService,
        rabbitmq_service_1.RabbitMQService])
], AuthService);
//# sourceMappingURL=auth.service.js.map