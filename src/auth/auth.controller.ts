import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Res,
  ValidationPipe,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GithubAuthGuard } from './guards/github-auth.guard';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('login')
  async login(@Body(ValidationPipe) loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    return this.authService.login(user);
  }

  @Post('login-2fa')
  async loginWith2FA(
    @Body('userId') userId: string,
    @Body('token') token: string,
  ) {
    // Verify the 2FA token first
    const response = await fetch(`http://localhost:${process.env.PORT || 3001}/auth/2fa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, token }),
    });
    
    const result = await response.json();
    
    if (!result.verified) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    return this.authService.loginWith2FA(userId);
  }

  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  async refresh(@Request() req) {
    return this.authService.refreshTokens(req.user.userId, req.user.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req) {
    return this.authService.logout(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me')
  async getProfile(@Request() req) {
    return req.user;
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(token, newPassword);
  }

  @Post('verify-reset-token')
  async verifyResetToken(@Body('token') token: string) {
    return this.authService.verifyResetToken(token);
  }

  // ============================================================================
  // OAUTH AUTHENTICATION (GOOGLE & GITHUB)
  // ============================================================================

  // Google OAuth
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    // Initiates Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Request() req, @Res() res: Response) {
    const user = await this.authService.validateOAuthUser(req.user);
    
    // For OAuth users, automatically disable 2FA since OAuth providers have their own security
    // This allows seamless OAuth login even if user previously had 2FA enabled
    const result = await this.authService.loginWithOAuth(user);
    
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`;
    
    return res.redirect(redirectUrl);
  }

  // GitHub OAuth
  @Get('github')
  @UseGuards(GithubAuthGuard)
  async githubAuth() {
    // Initiates GitHub OAuth flow
  }

  @Get('github/callback')
  @UseGuards(GithubAuthGuard)
  async githubAuthCallback(@Request() req, @Res() res: Response) {
    const user = await this.authService.validateOAuthUser(req.user);
    
    // For OAuth users, automatically disable 2FA since OAuth providers have their own security
    // This allows seamless OAuth login even if user previously had 2FA enabled
    const result = await this.authService.loginWithOAuth(user);
    
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`;
    
    return res.redirect(redirectUrl);
  }
}
