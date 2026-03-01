import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { UserDocument } from '../users/schemas/user.schema';
import { EmailService } from '../email/email.service';
export declare class AuthService {
    private userModel;
    private jwtService;
    private configService;
    private emailService;
    constructor(userModel: Model<UserDocument>, jwtService: JwtService, configService: ConfigService, emailService: EmailService);
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
    }>;
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
