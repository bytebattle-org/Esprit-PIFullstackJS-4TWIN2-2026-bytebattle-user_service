import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  HttpCode,
} from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('auth/2fa')
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  /**
   * Get 2FA status for the current user
   */
  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getStatus(@Request() req) {
    return this.twoFactorService.getTwoFactorStatus(req.user.userId);
  }

  /**
   * Step 1: Generate secret + QR code
   * User calls this from their profile settings
   */
  @UseGuards(JwtAuthGuard)
  @Post('generate')
  async generate(@Request() req) {
    const { secret, otpauthUrl } = await this.twoFactorService.generateSecret(
      req.user.userId,
    );
    const qrCode = await this.twoFactorService.generateQrCode(otpauthUrl);

    return {
      qrCode,
      secret, // Show this as backup in case QR scan fails
    };
  }

  /**
   * Step 2: Verify the code and enable 2FA
   * Returns recovery codes that user must save
   */
  @UseGuards(JwtAuthGuard)
  @Post('enable')
  @HttpCode(200)
  async enable(@Request() req, @Body('token') token: string) {
    const recoveryCodes = await this.twoFactorService.enableTwoFactor(
      req.user.userId,
      token,
    );

    return {
      message: '2FA has been enabled successfully',
      recoveryCodes,
      warning: 'Save these recovery codes in a safe place. You will not see them again.',
    };
  }

  /**
   * Disable 2FA (requires current TOTP token)
   */
  @UseGuards(JwtAuthGuard)
  @Post('disable')
  @HttpCode(200)
  async disable(@Request() req, @Body('token') token: string) {
    await this.twoFactorService.disableTwoFactor(req.user.userId, token);

    return {
      message: '2FA has been disabled successfully',
    };
  }

  /**
   * Verify 2FA token during login (called by auth service)
   * This endpoint is public but requires userId
   */
  @Post('verify')
  @HttpCode(200)
  async verify(
    @Body('userId') userId: string,
    @Body('token') token: string,
  ) {
    const isValid = await this.twoFactorService.verifyLoginToken(userId, token);

    if (!isValid) {
      return { verified: false };
    }

    return { verified: true };
  }

  /**
   * Get QR code for login (shows existing TOTP secret)
   */
  @Post('login-qr')
  @HttpCode(200)
  async getLoginQR(@Body('userId') userId: string) {
    return this.twoFactorService.getLoginQRCode(userId);
  }
}
