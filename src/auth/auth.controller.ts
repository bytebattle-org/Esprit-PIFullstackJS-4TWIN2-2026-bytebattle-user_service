import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  // Get,  // Uncomment for OAuth
  // Res,  // Uncomment for OAuth
  ValidationPipe,
} from '@nestjs/common';
// import { Response } from 'express';  // Uncomment for OAuth
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
// import { GoogleAuthGuard } from './guards/google-auth.guard';  // Uncomment for OAuth
// import { GithubAuthGuard } from './guards/github-auth.guard';  // Uncomment for OAuth
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
  // OAUTH AUTHENTICATION (GOOGLE & GITHUB) - COMMENTED OUT FOR LATER
  // ============================================================================
  // To enable OAuth:
  // 1. Get OAuth credentials from Google Cloud Console and GitHub
  // 2. Update .env with GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, etc.
  // 3. Uncomment the code below
  // 4. Uncomment OAuth imports at the top of this file
  // 5. Uncomment OAuth strategies in auth.module.ts
  // 6. Restart the service
  // ============================================================================

  /*
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
    const tokens = await this.authService.login(user);
    
    // Redirect to frontend with tokens
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;
    
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
    const tokens = await this.authService.login(user);
    
    // Redirect to frontend with tokens
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;
    
    return res.redirect(redirectUrl);
  }
  */
}
