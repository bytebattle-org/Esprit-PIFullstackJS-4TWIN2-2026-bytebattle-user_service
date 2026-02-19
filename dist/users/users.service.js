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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bcrypt = __importStar(require("bcrypt"));
const user_schema_1 = require("./schemas/user.schema");
const email_service_1 = require("../email/email.service");
let UsersService = class UsersService {
    userModel;
    emailService;
    constructor(userModel, emailService) {
        this.userModel = userModel;
        this.emailService = emailService;
    }
    generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async create(createUserDto) {
        const { username, email, password } = createUserDto;
        const existingUser = await this.userModel.findOne({
            $or: [{ email }, { username }],
        });
        if (existingUser) {
            throw new common_1.ConflictException('Username or email already exists');
        }
        const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;
        const verificationCode = this.generateVerificationCode();
        const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);
        const user = new this.userModel({
            username,
            email,
            passwordHash,
            verificationCode,
            verificationCodeExpires,
            isEmailVerified: false,
            provider: 'local',
            statistics: {
                totalPoints: 0,
                level: 1,
                currentStreak: 0,
                xp: 0,
                challengesCompleted: 0,
                successRate: 0,
                totalTimeCoding: 0,
            },
            profile: {},
            achievements: [],
            badges: [],
        });
        await user.save();
        try {
            await this.emailService.sendVerificationEmail(email, verificationCode, username);
        }
        catch (error) {
            console.error('Failed to send verification email:', error);
        }
        return user;
    }
    async verifyEmail(email, code) {
        const user = await this.userModel.findOne({ email });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.isEmailVerified) {
            throw new common_1.BadRequestException('Email already verified');
        }
        if (user.verificationCode !== code) {
            throw new common_1.BadRequestException('Invalid verification code');
        }
        if (!user.verificationCodeExpires || user.verificationCodeExpires < new Date()) {
            throw new common_1.BadRequestException('Verification code expired');
        }
        user.isEmailVerified = true;
        user.verificationCode = undefined;
        user.verificationCodeExpires = undefined;
        await user.save();
        try {
            await this.emailService.sendWelcomeEmail(email, user.username);
        }
        catch (error) {
            console.error('Failed to send welcome email:', error);
        }
        const { passwordHash, ...userResponse } = user.toObject();
        return {
            message: 'Email verified successfully',
            user: userResponse,
        };
    }
    async resendVerificationCode(email) {
        const user = await this.userModel.findOne({ email });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.isEmailVerified) {
            throw new common_1.BadRequestException('Email already verified');
        }
        const verificationCode = this.generateVerificationCode();
        const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);
        user.verificationCode = verificationCode;
        user.verificationCodeExpires = verificationCodeExpires;
        await user.save();
        try {
            await this.emailService.sendVerificationEmail(email, verificationCode, user.username);
        }
        catch (error) {
            console.error('Failed to resend verification email:', error);
            throw new common_1.BadRequestException('Failed to send verification email');
        }
        return { message: 'Verification code sent successfully' };
    }
    async findAll() {
        return this.userModel.find().select('-passwordHash').exec();
    }
    async findOne(id) {
        const user = await this.userModel.findById(id).select('-passwordHash').exec();
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async findByEmail(email) {
        return this.userModel.findOne({ email }).exec();
    }
    async findByUsername(username) {
        return this.userModel.findOne({ username }).exec();
    }
    async update(id, updateUserDto) {
        const updateData = {};
        if (updateUserDto.username)
            updateData.username = updateUserDto.username;
        if (updateUserDto.email)
            updateData.email = updateUserDto.email;
        if (updateUserDto.password) {
            updateData.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
        }
        if (updateUserDto.avatar || updateUserDto.bio || updateUserDto.preferredLanguages) {
            if (updateUserDto.avatar)
                updateData['profile.avatar'] = updateUserDto.avatar;
            if (updateUserDto.bio)
                updateData['profile.bio'] = updateUserDto.bio;
            if (updateUserDto.preferredLanguages) {
                updateData['profile.preferredLanguages'] = updateUserDto.preferredLanguages;
            }
        }
        const user = await this.userModel
            .findByIdAndUpdate(id, updateData, { new: true })
            .select('-passwordHash')
            .exec();
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async remove(id) {
        const result = await this.userModel.findByIdAndDelete(id).exec();
        if (!result) {
            throw new common_1.NotFoundException('User not found');
        }
    }
    async updateStats(id, stats) {
        const updateData = {};
        Object.keys(stats).forEach((key) => {
            updateData[`statistics.${key}`] = stats[key];
        });
        const user = await this.userModel
            .findByIdAndUpdate(id, { $inc: updateData }, { new: true })
            .select('-passwordHash')
            .exec();
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async addAchievement(id, achievement) {
        const user = await this.userModel
            .findByIdAndUpdate(id, {
            $addToSet: {
                achievements: {
                    ...achievement,
                    unlockedAt: new Date(),
                },
            },
        }, { new: true })
            .select('-passwordHash')
            .exec();
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async addBadge(id, badge) {
        const user = await this.userModel
            .findByIdAndUpdate(id, { $addToSet: { badges: badge } }, { new: true })
            .select('-passwordHash')
            .exec();
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async getLeaderboard(limit = 10) {
        return this.userModel
            .find()
            .select('-passwordHash')
            .sort({ 'statistics.totalPoints': -1 })
            .limit(limit)
            .exec();
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        email_service_1.EmailService])
], UsersService);
//# sourceMappingURL=users.service.js.map