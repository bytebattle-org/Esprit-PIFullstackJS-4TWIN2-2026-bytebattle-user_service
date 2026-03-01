import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { User, UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class TwoFactorService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  /**
   * Generate a new TOTP secret for the user
   */
  async generateSecret(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const secret = authenticator.generateSecret();
    const appName = 'ByteBattle';
    const otpauthUrl = authenticator.keyuri(user.email, appName, secret);

    // Save the secret temporarily (not yet enabled)
    await this.userModel.findByIdAndUpdate(userId, {
      twoFactorSecret: secret,
    });

    return { secret, otpauthUrl };
  }

  /**
   * Generate QR code as a data URL
   */
  async generateQrCode(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl);
  }

  /**
   * Verify a TOTP token against the user's secret
   */
  verifyToken(token: string, secret: string): boolean {
    try {
      return authenticator.verify({ token, secret });
    } catch (error) {
      return false;
    }
  }

  /**
   * Enable 2FA after the user verifies their first code
   */
  async enableTwoFactor(userId: string, token: string): Promise<string[]> {
    const user = await this.userModel.findById(userId);
    
    if (!user || !user.twoFactorSecret) {
      throw new UnauthorizedException('2FA secret not found. Please generate a new QR code.');
    }

    // Verify the token before enabling
    const isValid = this.verifyToken(token, user.twoFactorSecret);
    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA token');
    }

    // Generate recovery codes
    const recoveryCodes = this.generateRecoveryCodes(8);
    const hashedRecoveryCodes = recoveryCodes.map(code => 
      crypto.createHash('sha256').update(code).digest('hex')
    );

    await this.userModel.findByIdAndUpdate(userId, {
      isTwoFactorEnabled: true,
      twoFactorRecoveryCodes: hashedRecoveryCodes,
    });

    return recoveryCodes;
  }

  /**
   * Disable 2FA
   */
  async disableTwoFactor(userId: string, token: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    
    if (!user || !user.twoFactorSecret) {
      throw new UnauthorizedException('2FA is not enabled');
    }

    // Verify the token before disabling
    const isValid = this.verifyToken(token, user.twoFactorSecret);
    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA token');
    }

    await this.userModel.findByIdAndUpdate(userId, {
      isTwoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorRecoveryCodes: [],
    });
  }

  /**
   * Verify 2FA token during login
   */
  async verifyLoginToken(userId: string, token: string): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    
    if (!user || !user.isTwoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException('2FA is not enabled for this user');
    }

    // Check if it's a regular TOTP token
    const isValidToken = this.verifyToken(token, user.twoFactorSecret);
    if (isValidToken) {
      return true;
    }

    // Check if it's a recovery code
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const recoveryCodeIndex = user.twoFactorRecoveryCodes.indexOf(hashedToken);
    
    if (recoveryCodeIndex !== -1) {
      // Remove the used recovery code
      const updatedCodes = [...user.twoFactorRecoveryCodes];
      updatedCodes.splice(recoveryCodeIndex, 1);
      
      await this.userModel.findByIdAndUpdate(userId, {
        twoFactorRecoveryCodes: updatedCodes,
      });
      
      return true;
    }

    return false;
  }

  /**
   * Generate random recovery codes
   */
  private generateRecoveryCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Get 2FA QR code for login (shows user's existing TOTP secret as QR)
   */
  async getLoginQRCode(userId: string) {
    const user = await this.userModel.findById(userId);
    
    if (!user || !user.isTwoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException('2FA is not enabled for this user');
    }

    const appName = 'ByteBattle';
    const otpauthUrl = authenticator.keyuri(user.email, appName, user.twoFactorSecret);
    const qrCode = await this.generateQrCode(otpauthUrl);

    return { qrCode, secret: user.twoFactorSecret };
  }

  /**
   * Get 2FA status for a user
   */
  async getTwoFactorStatus(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      isEnabled: user.isTwoFactorEnabled || false,
      hasRecoveryCodes: (user.twoFactorRecoveryCodes?.length || 0) > 0,
      recoveryCodesCount: user.twoFactorRecoveryCodes?.length || 0,
    };
  }
}
