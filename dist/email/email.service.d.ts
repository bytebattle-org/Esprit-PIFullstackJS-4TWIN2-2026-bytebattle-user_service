import { ConfigService } from '@nestjs/config';
export declare class EmailService {
    private configService;
    private transporter;
    constructor(configService: ConfigService);
    sendVerificationEmail(email: string, code: string, username: string): Promise<void>;
    sendWelcomeEmail(email: string, username: string): Promise<void>;
    sendPasswordResetEmail(email: string, resetToken: string, username: string): Promise<void>;
}
