import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly usersService;
    private readonly configService;
    private readonly internalApiKey;
    constructor(usersService: UsersService, configService: ConfigService);
    create(createUserDto: CreateUserDto): Promise<import("./schemas/user.schema").User>;
    verifyEmail(body: {
        email: string;
        code: string;
    }): Promise<{
        message: string;
        user: any;
    }>;
    resendVerification(body: {
        email: string;
    }): Promise<{
        message: string;
    }>;
    getLeaderboard(limit?: string): Promise<import("./schemas/user.schema").User[]>;
    searchUsers(query: string): Promise<{
        users: (import("mongoose").Document<unknown, {}, import("./schemas/user.schema").UserDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/user.schema").User & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
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
    sendFriendRequest(body: {
        fromUserId: string;
        toUserId: string;
    }): Promise<{
        message: string;
    }>;
    acceptFriendRequest(requestId: string, body: {
        userId?: string;
    }): Promise<{
        message: string;
    }>;
    rejectFriendRequest(requestId: string, body: {
        userId?: string;
    }): Promise<{
        message: string;
    }>;
    getAnalytics(): Promise<{
        totalUsers: number;
        activeUsers: number;
    }>;
    findAll(): Promise<import("./schemas/user.schema").User[]>;
    updateRole(id: string, role: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/user.schema").UserDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/user.schema").User & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    } & {
        id: string;
    }>;
    updateStatus(id: string, isBanned: boolean): Promise<import("mongoose").Document<unknown, {}, import("./schemas/user.schema").UserDocument, {}, import("mongoose").DefaultSchemaOptions> & import("./schemas/user.schema").User & import("mongoose").Document<import("mongoose").Types.ObjectId, any, any, Record<string, any>, {}> & Required<{
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
    remove(id: string, req: any): Promise<void>;
    findOne(id: string): Promise<import("./schemas/user.schema").User>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<import("./schemas/user.schema").User>;
    updateStats(id: string, stats: {
        totalPoints?: number;
        level?: number;
        currentStreak?: number;
        xp?: number;
        challengesCompleted?: number;
        successRate?: number;
        totalTimeCoding?: number;
    }): Promise<import("./schemas/user.schema").User>;
    updateStatsInternal(id: string, internalApiKey: string, stats: {
        totalPoints?: number;
        level?: number;
        currentStreak?: number;
        xp?: number;
        challengesCompleted?: number;
        successRate?: number;
        totalTimeCoding?: number;
    }): Promise<import("./schemas/user.schema").User>;
    addAchievement(id: string, achievement: {
        id: string;
        name: string;
        rarity: 'common' | 'rare' | 'epic' | 'legendary';
    }): Promise<import("./schemas/user.schema").User>;
    addBadge(id: string, badge: string): Promise<import("./schemas/user.schema").User>;
}
