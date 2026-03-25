import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

@Injectable()
export class EmailService {
  private readonly transporter: nodemailer.Transporter | null;

  constructor(private readonly configService: ConfigService) {
    const smtpUser = this.configService.get('SMTP_USER');
    const smtpPass = this.configService.get('SMTP_PASS');
    const smtpHost = this.configService.get('SMTP_HOST') || 'smtp.gmail.com';
    const smtpPort = Number(this.configService.get('SMTP_PORT') || 587);

    // Only create transporter if SMTP credentials are provided
    if (smtpUser && smtpPass) {
      const transportOptions: SMTPTransport.Options = {
        host: smtpHost,
        port: smtpPort,
        secure: false,
        tls: {
          servername: smtpHost,
        },
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      };

      this.transporter = nodemailer.createTransport(transportOptions);
    } else {
      console.warn('⚠️  Email service disabled: SMTP credentials not configured');
      this.transporter = null;
    }
  }

  async sendVerificationEmail(email: string, code: string, username: string) {
    if (!this.transporter) {
      console.warn('⚠️  Email not sent: SMTP not configured');
      return;
    }

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
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, username: string) {
    if (!this.transporter) {
      console.warn('⚠️  Email not sent: SMTP not configured');
      return;
    }

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
    } catch (error) {
      console.error('Error sending welcome email:', error);
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string, username: string) {
    if (!this.transporter) {
      console.warn('⚠️  Email not sent: SMTP not configured');
      return;
    }

    const mailOptions = {
      from: this.configService.get('SMTP_FROM') || 'ByteBattle <noreply@bytebattle.com>',
      to: email,
      subject: 'Reset Your ByteBattle Password',
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
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${username}!</h2>
              <p>We received a request to reset your ByteBattle password.</p>
              <p>Use the code below to reset your password:</p>
              <div class="code">${resetToken}</div>
              <p>This code will expire in <strong>1 hour</strong>.</p>
              <div class="warning">
                <strong>⚠️ Security Notice:</strong><br>
                If you didn't request this password reset, please ignore this email and your password will remain unchanged.
              </div>
              <p>For security reasons, never share this code with anyone.</p>
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
      console.log(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error('Error sending password reset email:', error);
    }
  }
}
