import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/types';
import { UserDocument } from '../../users/schemas/user.schema';
export declare class WebAuthnService {
    private userModel;
    private configService;
    private rpName;
    private rpID;
    private origin;
    constructor(userModel: Model<UserDocument>, configService: ConfigService);
    generateRegistrationOptions(userId: string): Promise<import("@simplewebauthn/server").PublicKeyCredentialCreationOptionsJSON>;
    verifyRegistration(userId: string, response: RegistrationResponseJSON): Promise<{
        verified: boolean;
        message: string;
    }>;
    generateAuthenticationOptions(email: string): Promise<{
        options: import("@simplewebauthn/server").PublicKeyCredentialRequestOptionsJSON;
        userId: import("mongoose").Types.ObjectId;
    }>;
    verifyAuthentication(email: string, response: AuthenticationResponseJSON): Promise<{
        username: string;
        email: string;
        role: string;
        isBanned: boolean;
        provider: string;
        providerId: string;
        providerAvatar: string;
        profile: {
            avatar?: string;
            bio?: string;
            preferredLanguages?: string[];
        };
        statistics: {
            totalPoints: number;
            level: number;
            currentStreak: number;
            xp: number;
            challengesCompleted: number;
            successRate: number;
            totalTimeCoding: number;
        };
        achievements: Array<{
            id: string;
            name: string;
            unlockedAt: Date;
            rarity: "common" | "rare" | "epic" | "legendary";
        }>;
        badges: string[];
        isEmailVerified: boolean;
        verificationCode?: string;
        verificationCodeExpires?: Date;
        passwordResetToken?: string;
        passwordResetExpires?: Date;
        webauthnCredentials: Array<{
            credentialId: string;
            credentialPublicKey: string;
            counter: number;
            transports?: string[];
            createdAt: Date;
        }>;
        twoFactorSecret?: string;
        isTwoFactorEnabled: boolean;
        twoFactorRecoveryCodes: string[];
        createdAt: Date;
        updatedAt: Date;
        _id: import("mongoose").Types.ObjectId;
        $locals: Record<string, unknown>;
        $op: "save" | "validate" | "remove" | null;
        $where: Record<string, unknown>;
        baseModelName?: string;
        collection: import("mongoose").Collection;
        db: import("mongoose").Connection;
        errors?: import("mongoose").Error.ValidationError;
        isNew: boolean;
        schema: import("mongoose").Schema;
        __v: number;
    }>;
    hasBiometricCredentials(email: string): Promise<boolean>;
    removeCredential(userId: string, credentialId: string): Promise<{
        message: string;
    }>;
}
