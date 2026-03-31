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
        void this.emailService
            .sendVerificationEmail(email, verificationCode, username)
            .catch((error) => {
            console.error('Failed to send verification email:', error);
        });
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
            .sort({ 'statistics.xp': -1, 'statistics.totalPoints': -1 })
            .limit(limit)
            .exec();
    }
    async getAdminAnalytics() {
        const totalUsers = await this.userModel.countDocuments();
        const activeUsers = await this.userModel.countDocuments({
            updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        });
        return {
            totalUsers,
            activeUsers,
        };
    }
    async updateRole(id, role) {
        if (!['user', 'admin'].includes(role)) {
            throw new common_1.BadRequestException('Invalid role');
        }
        const user = await this.userModel.findByIdAndUpdate(id, { role }, { new: true }).select('-passwordHash').exec();
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async updateStatus(id, isBanned) {
        const user = await this.userModel.findByIdAndUpdate(id, { isBanned }, { new: true }).select('-passwordHash').exec();
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    async resetPasswordAdmin(id, newPassword) {
        const password = newPassword || Math.random().toString(36).slice(-8);
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await this.userModel.findByIdAndUpdate(id, { passwordHash }, { new: true }).select('-passwordHash').exec();
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return { message: 'Password reset successfully', tempPassword: password };
    }
    async searchUsers(query) {
        if (!query || typeof query !== 'string' || query.trim().length < 2) {
            return { users: [] };
        }
        const users = await this.userModel
            .find({
            $or: [
                { username: { $regex: query.trim(), $options: 'i' } },
                { email: { $regex: query.trim(), $options: 'i' } },
            ],
        })
            .select('username email profile statistics')
            .limit(10)
            .exec();
        return { users };
    }
    async getFriends(userId) {
        const user = await this.userModel
            .findById(userId)
            .populate('friends', 'username email profile statistics')
            .exec();
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return { friends: user.friends || [] };
    }
    async getFriendRequests(userId) {
        const user = await this.userModel.findById(userId).exec();
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return { requests: user.friendRequests || [] };
    }
    async sendFriendRequest(fromId, toId) {
        if (fromId === toId) {
            throw new common_1.BadRequestException('Cannot send friend request to yourself');
        }
        const toUser = await this.userModel.findById(toId);
        if (!toUser) {
            throw new common_1.NotFoundException('User not found');
        }
        const fromUser = await this.userModel.findById(fromId);
        if (fromUser?.friends?.includes(toId)) {
            throw new common_1.BadRequestException('Already friends');
        }
        const existingRequest = toUser.friendRequests?.find((req) => req.from?.toString() === fromId);
        if (existingRequest) {
            throw new common_1.BadRequestException('Friend request already sent');
        }
        if (!toUser.friendRequests) {
            toUser.friendRequests = [];
        }
        toUser.friendRequests.push({
            _id: new Date().getTime().toString(),
            from: fromUser,
            createdAt: new Date(),
        });
        await toUser.save();
        return { message: 'Friend request sent successfully' };
    }
    async acceptFriendRequest(requestId) {
        const user = await this.userModel.findOne({
            'friendRequests._id': requestId,
        });
        if (!user) {
            throw new common_1.NotFoundException('Friend request not found');
        }
        const request = user.friendRequests.find((req) => req._id === requestId);
        if (!request) {
            throw new common_1.NotFoundException('Friend request not found');
        }
        const friendId = request.from._id || request.from;
        if (!user.friends) {
            user.friends = [];
        }
        user.friends.push(friendId);
        user.friendRequests = user.friendRequests.filter((req) => req._id !== requestId);
        await user.save();
        const friend = await this.userModel.findById(friendId);
        if (friend) {
            if (!friend.friends) {
                friend.friends = [];
            }
            friend.friends.push(user._id.toString());
            await friend.save();
        }
        return { message: 'Friend request accepted' };
    }
    async rejectFriendRequest(requestId) {
        const user = await this.userModel.findOne({
            'friendRequests._id': requestId,
        });
        if (!user) {
            throw new common_1.NotFoundException('Friend request not found');
        }
        user.friendRequests = user.friendRequests.filter((req) => req._id !== requestId);
        await user.save();
        return { message: 'Friend request rejected' };
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