import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { UserDocument } from '../users/schemas/user.schema';
import { EmailService } from '../email/email.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
export declare class AuthService {
    private userModel;
    private jwtService;
    private configService;
    private emailService;
    private readonly rabbitMQService;
    private readonly logger;
    constructor(userModel: Model<UserDocument>, jwtService: JwtService, configService: ConfigService, emailService: EmailService, rabbitMQService: RabbitMQService);
    validateUser(email: string, password: string): Promise<any>;
    login(user: any): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            username: any;
            email: any;
            role: any;
            profile: any;
            statistics: any;
        };
    } | {
        requiresTwoFactor: boolean;
        userId: any;
        message: string;
    }>;
    loginWith2FA(userId: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            username: any;
            email: any;
            role: any;
            profile: any;
            statistics: any;
        };
    }>;
    loginWithOAuth(user: any): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            username: any;
            email: any;
            role: any;
            profile: any;
            statistics: any;
        };
    }>;
    private generateTokens;
    refreshTokens(userId: string, refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string): Promise<{
        message: string;
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
        resetToken?: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
    verifyResetToken(token: string): Promise<{
        valid: boolean;
        email?: string;
    }>;
    validateOAuthUser(profile: any): Promise<any>;
    private generateUniqueUsername;
}
