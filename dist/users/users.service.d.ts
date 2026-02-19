import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { EmailService } from '../email/email.service';
export declare class UsersService {
    private userModel;
    private emailService;
    constructor(userModel: Model<UserDocument>, emailService: EmailService);
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
        successRate?: number;
        totalTimeCoding?: number;
    }): Promise<User>;
    addAchievement(id: string, achievement: {
        id: string;
        name: string;
        rarity: 'common' | 'rare' | 'epic' | 'legendary';
    }): Promise<User>;
    addBadge(id: string, badge: string): Promise<User>;
    getLeaderboard(limit?: number): Promise<User[]>;
}
