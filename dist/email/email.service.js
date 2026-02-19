"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
let EmailService = class EmailService {
    configService;
    transporter;
    constructor(configService) {
        this.configService = configService;
        this.transporter = nodemailer.createTransport({
            host: this.configService.get('SMTP_HOST') || 'smtp.gmail.com',
            port: this.configService.get('SMTP_PORT') || 587,
            secure: false,
            auth: {
                user: this.configService.get('SMTP_USER'),
                pass: this.configService.get('SMTP_PASS'),
            },
        });
    }
    async sendVerificationEmail(email, code, username) {
        const mailOptions = {
            from: this.configService.get('SMTP_FROM') || 'ByteBattle <noreply@bytebattle.com>',
            to: email,
            subject: 'Verify Your ByteBattle Account',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .code { background: #fff; border: 2px dashed #667eea; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0; border-radius: 5px; color: #667eea; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎮 Welcome to ByteBattle!</h1>
            </div>
            <div class="content">
              <h2>Hi ${username}!</h2>
              <p>Thanks for joining ByteBattle - the ultimate coding challenge platform!</p>
              <p>To complete your registration, please verify your email address using the code below:</p>
              <div class="code">${code}</div>
              <p>This code will expire in <strong>15 minutes</strong>.</p>
              <p>If you didn't create an account with ByteBattle, please ignore this email.</p>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                <p><strong>What's next?</strong></p>
                <ul>
                  <li>Complete coding challenges</li>
                  <li>Compete with other developers</li>
                  <li>Earn achievements and badges</li>
                  <li>Climb the leaderboard</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>© 2026 ByteBattle. All rights reserved.</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
        };
        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Verification email sent to ${email}`);
        }
        catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }
    async sendWelcomeEmail(email, username) {
        const mailOptions = {
            from: this.configService.get('SMTP_FROM') || 'ByteBattle <noreply@bytebattle.com>',
            to: email,
            subject: 'Welcome to ByteBattle! 🎉',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Account Verified!</h1>
            </div>
            <div class="content">
              <h2>Welcome aboard, ${username}!</h2>
              <p>Your email has been successfully verified. You're all set to start your coding journey!</p>
              <p>Get ready to:</p>
              <ul>
                <li>🏆 Compete in real-time coding battles</li>
                <li>📈 Track your progress and stats</li>
                <li>🎖️ Unlock achievements and badges</li>
                <li>👥 Challenge other developers</li>
              </ul>
              <p style="margin-top: 30px;">Happy coding!</p>
            </div>
            <div class="footer">
              <p>© 2026 ByteBattle. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
        };
        try {
            await this.transporter.sendMail(mailOptions);
            console.log(`Welcome email sent to ${email}`);
        }
        catch (error) {
            console.error('Error sending welcome email:', error);
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map