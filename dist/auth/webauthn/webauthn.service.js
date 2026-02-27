"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebAuthnService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const server_1 = require("@simplewebauthn/server");
const user_schema_1 = require("../../users/schemas/user.schema");
let WebAuthnService = class WebAuthnService {
    userModel;
    configService;
    rpName;
    rpID;
    origin;
    constructor(userModel, configService) {
        this.userModel = userModel;
        this.configService = configService;
        this.rpName = 'ByteBattle';
        this.rpID = this.configService.get('WEBAUTHN_RP_ID') || 'localhost';
        this.origin = this.configService.get('WEBAUTHN_ORIGIN') || 'http://localhost:5173';
    }
    async generateRegistrationOptions(userId) {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const excludeCredentials = user.webauthnCredentials?.map((cred) => ({
            id: cred.credentialId,
            transports: cred.transports,
        })) || [];
        const options = await (0, server_1.generateRegistrationOptions)({
            rpName: this.rpName,
            rpID: this.rpID,
            userID: new TextEncoder().encode(userId),
            userName: user.email,
            userDisplayName: user.username,
            attestationType: 'none',
            excludeCredentials,
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
                authenticatorAttachment: 'platform',
            },
        });
        user.currentChallenge = options.challenge;
        await user.save();
        return options;
    }
    async verifyRegistration(userId, response) {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (!user.currentChallenge) {
            throw new common_1.BadRequestException('No challenge found. Please start registration again.');
        }
        let verification;
        try {
            verification = await (0, server_1.verifyRegistrationResponse)({
                response,
                expectedChallenge: user.currentChallenge,
                expectedOrigin: this.origin,
                expectedRPID: this.rpID,
            });
        }
        catch (error) {
            throw new common_1.BadRequestException(`Registration verification failed: ${error.message}`);
        }
        const { verified, registrationInfo } = verification;
        if (verified && registrationInfo) {
            const { credential } = registrationInfo;
            const newCredential = {
                credentialId: Buffer.from(credential.id).toString('base64url'),
                credentialPublicKey: Buffer.from(credential.publicKey).toString('base64url'),
                counter: credential.counter,
                transports: response.response.transports || [],
                createdAt: new Date(),
            };
            user.webauthnCredentials = user.webauthnCredentials || [];
            user.webauthnCredentials.push(newCredential);
            user.currentChallenge = undefined;
            await user.save();
            return { verified: true, message: 'Biometric authentication registered successfully' };
        }
        throw new common_1.BadRequestException('Registration verification failed');
    }
    async generateAuthenticationOptions(email) {
        const user = await this.userModel.findOne({ email });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (!user.webauthnCredentials || user.webauthnCredentials.length === 0) {
            throw new common_1.BadRequestException('No biometric credentials registered for this user');
        }
        const allowCredentials = user.webauthnCredentials.map((cred) => ({
            id: cred.credentialId,
            transports: cred.transports,
        }));
        const options = await (0, server_1.generateAuthenticationOptions)({
            rpID: this.rpID,
            allowCredentials,
            userVerification: 'preferred',
        });
        user.currentChallenge = options.challenge;
        await user.save();
        return { options, userId: user._id };
    }
    async verifyAuthentication(email, response) {
        const user = await this.userModel.findOne({ email });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (!user.currentChallenge) {
            throw new common_1.BadRequestException('No challenge found. Please start authentication again.');
        }
        const credential = user.webauthnCredentials?.find((cred) => cred.credentialId === response.id);
        if (!credential) {
            throw new common_1.BadRequestException('Credential not found');
        }
        let verification;
        try {
            verification = await (0, server_1.verifyAuthenticationResponse)({
                response,
                expectedChallenge: user.currentChallenge,
                expectedOrigin: this.origin,
                expectedRPID: this.rpID,
                credential: {
                    id: credential.credentialId,
                    publicKey: Buffer.from(credential.credentialPublicKey, 'base64url'),
                    counter: credential.counter,
                    transports: credential.transports,
                },
            });
        }
        catch (error) {
            throw new common_1.BadRequestException(`Authentication failed: ${error.message}`);
        }
        const { verified, authenticationInfo } = verification;
        if (verified) {
            credential.counter = authenticationInfo.newCounter;
            await user.save();
            user.currentChallenge = undefined;
            await user.save();
            const { passwordHash, refreshToken, currentChallenge, ...result } = user.toObject();
            return result;
        }
        throw new common_1.BadRequestException('Authentication failed');
    }
    async hasBiometricCredentials(email) {
        const user = await this.userModel.findOne({ email });
        if (!user) {
            return false;
        }
        return user.webauthnCredentials && user.webauthnCredentials.length > 0;
    }
    async removeCredential(userId, credentialId) {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        user.webauthnCredentials = user.webauthnCredentials?.filter((cred) => cred.credentialId !== credentialId) || [];
        await user.save();
        return { message: 'Credential removed successfully' };
    }
};
exports.WebAuthnService = WebAuthnService;
exports.WebAuthnService = WebAuthnService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        config_1.ConfigService])
], WebAuthnService);
//# sourceMappingURL=webauthn.service.js.map