import { OnModuleInit } from '@nestjs/common';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { DailyChallenge, DailyChallengeDocument } from './schemas/daily-challenge.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { EmailService } from '../email/email.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
export declare class UsersService implements OnModuleInit {
    private userModel;
    private dailyChallengeModel;
    private emailService;
    private readonly rabbitMQService;
    private readonly logger;
    constructor(userModel: Model<UserDocument>, dailyChallengeModel: Model<DailyChallengeDocument>, emailService: EmailService, rabbitMQService: RabbitMQService);
    onModuleInit(): Promise<void>;
    private handleBattleFinished;
    private handleBattleStarted;
    private generateVerificationCode;
    create(createUserDto: CreateUserDto): Promise<User>;
    verifyEmail(email: string, code: string): Promise<{
        message: string;
        user: any;
    }>;
    resendVerificationCode(email: string): Promise<{
        message: string;
    }>;
    findAll(): Promise<User[]>;
    findOne(id: string): Promise<User>;
    findByEmail(email: string): Promise<UserDocument | null>;
    findByUsername(username: string): Promise<UserDocument | null>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<User>;
    remove(id: string): Promise<void>;
    updateStats(id: string, stats: {
        totalPoints?: number;
        level?: number;
        currentStreak?: number;
        xp?: number;
        challengesCompleted?: number;
        challengesAttempted?: number;
        successRate?: number;
        totalTimeCoding?: number;
    }): Promise<User>;
    private calculateLevelFromXp;
    recalculateAllLevels(): Promise<{
        updated: number;
        errors: number;
    }>;
    addAchievement(id: string, achievement: {
        id: string;
        name: string;
        rarity: 'common' | 'rare' | 'epic' | 'legendary';
    }): Promise<User>;
    addBadge(id: string, badge: string): Promise<User>;
    getLeaderboard(limit?: number): Promise<User[]>;
    getAdminAnalytics(): Promise<{
        totalUsers: number;
        activeUsers: number;
    }>;
    updateRole(id: string, role: string): Promise<import("mongoose").Document<unknown, {}, UserDocument, {}, import("mongoose").DefaultSchemaOptions> & User & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    updateStatus(id: string, isBanned: boolean): Promise<import("mongoose").Document<unknown, {}, UserDocument, {}, import("mongoose").DefaultSchemaOptions> & User & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    resetPasswordAdmin(id: string, newPassword?: string): Promise<{
        message: string;
        tempPassword: string;
    }>;
    searchUsers(query: string): Promise<{
        users: (import("mongoose").Document<unknown, {}, UserDocument, {}, import("mongoose").DefaultSchemaOptions> & User & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
            _id: import("mongoose").Types.ObjectId;
        }> & {
            __v: number;
        } & {
            id: string;
        })[];
    }>;
    getFriends(userId: string): Promise<{
        friends: string[];
    }>;
    getFriendRequests(userId: string): Promise<{
        requests: {
            _id: string;
            from: any;
            createdAt: Date;
        }[];
    }>;
    sendFriendRequest(fromId: string, toId: string): Promise<{
        message: string;
    }>;
    acceptFriendRequest(requestId: string): Promise<{
        message: string;
    }>;
    rejectFriendRequest(requestId: string): Promise<{
        message: string;
    }>;
    getTodayDailyChallenge(): Promise<import("mongoose").Document<unknown, {}, DailyChallengeDocument, {}, import("mongoose").DefaultSchemaOptions> & DailyChallenge & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    completeDailyChallenge(userId: string, challengeId: string): Promise<{
        message: string;
        streak: number;
        longestStreak: number;
        bonusXp: number;
        streakIncreased: boolean;
    }>;
    getUserDailyChallengeStats(userId: string): Promise<{
        currentStreak: number;
        longestStreak: number;
        lastCompletedDate: Date | undefined;
        totalDailyChallengesCompleted: number;
        completedToday: boolean;
    }>;
}
