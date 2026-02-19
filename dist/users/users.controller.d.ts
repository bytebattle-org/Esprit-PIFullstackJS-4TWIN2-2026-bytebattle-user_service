import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
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
    findAll(): Promise<import("./schemas/user.schema").User[]>;
    getLeaderboard(limit?: string): Promise<import("./schemas/user.schema").User[]>;
    findOne(id: string): Promise<import("./schemas/user.schema").User>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<import("./schemas/user.schema").User>;
    remove(id: string): Promise<void>;
    updateStats(id: string, stats: {
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
