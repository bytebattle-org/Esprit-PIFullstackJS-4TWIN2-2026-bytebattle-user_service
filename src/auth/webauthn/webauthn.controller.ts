import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Query,
} from '@nestjs/common';
import { WebAuthnService } from './webauthn.service';
import { AuthService } from '../auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('auth/webauthn')
export class WebAuthnController {
  constructor(
    private webAuthnService: WebAuthnService,
    private authService: AuthService,
  ) {}

  /**
   * Check if biometric login is available for an email
   */
  @Get('check')
  async checkBiometric(@Query('email') email: string) {
    const hasCredentials = await this.webAuthnService.hasBiometricCredentials(email);
    return { available: hasCredentials };
  }

  /**
   * Start biometric registration (requires authentication)
   */
  @UseGuards(JwtAuthGuard)
  @Post('register/start')
  async startRegistration(@Request() req) {
    const options = await this.webAuthnService.generateRegistrationOptions(req.user.userId);
    return options;
  }

  /**
   * Complete biometric registration
   */
  @UseGuards(JwtAuthGuard)
  @Post('register/verify')
  async verifyRegistration(@Request() req, @Body() body: any) {
    return this.webAuthnService.verifyRegistration(req.user.userId, body);
  }

  /**
   * Start biometric authentication (login)
   */
  @Post('login/start')
  async startAuthentication(@Body('email') email: string) {
    const result = await this.webAuthnService.generateAuthenticationOptions(email);
    return result.options;
  }

  /**
   * Complete biometric authentication and get tokens
   */
  @Post('login/verify')
  async verifyAuthentication(@Body() body: { email: string; response: any }) {
    const user = await this.webAuthnService.verifyAuthentication(body.email, body.response);
    return this.authService.login(user);
  }

  /**
   * Remove a biometric credential
   */
  @UseGuards(JwtAuthGuard)
  @Post('remove')
  async removeCredential(@Request() req, @Body('credentialId') credentialId: string) {
    return this.webAuthnService.removeCredential(req.user.userId, credentialId);
  }
}
