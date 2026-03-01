import { WebAuthnService } from './webauthn.service';
import { AuthService } from '../auth.service';
export declare class WebAuthnController {
    private webAuthnService;
    private authService;
    constructor(webAuthnService: WebAuthnService, authService: AuthService);
    checkBiometric(email: string): Promise<{
        available: boolean;
    }>;
    startRegistration(req: any): Promise<import("@simplewebauthn/server").PublicKeyCredentialCreationOptionsJSON>;
    verifyRegistration(req: any, body: any): Promise<{
        verified: boolean;
        message: string;
    }>;
    startAuthentication(email: string): Promise<import("@simplewebauthn/server").PublicKeyCredentialRequestOptionsJSON>;
    verifyAuthentication(body: {
        email: string;
        response: any;
    }): Promise<{
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
    removeCredential(req: any, credentialId: string): Promise<{
        message: string;
    }>;
}
