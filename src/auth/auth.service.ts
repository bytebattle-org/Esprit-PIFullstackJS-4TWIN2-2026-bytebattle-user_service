import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../users/schemas/user.schema';
import { EmailService } from '../email/email.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userModel.findOne({ email });
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new BadRequestException('Please verify your email first');
    }

    if (user.isBanned) {
      throw new ForbiddenException('Your account has been banned. Please contact support.');
    }

    const { passwordHash, refreshToken, ...result } = user.toObject();
    return result;
  }

  async login(user: any) {
    // Check if 2FA is enabled
    if (user.isTwoFactorEnabled) {
      return {
        requiresTwoFactor: true,
        userId: user._id.toString(),
        message: 'Please enter your 2FA code',
      };
    }

    // 📢 Emit user.logged_in event
    await this.rabbitMQService.emitUserLoggedIn({
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
    });

    this.logger.log(`📢 User logged in event emitted for ${user.username}`);

    return this.generateTokens(user);
  }

  async loginWith2FA(userId: string) {
    const user = await this.userModel.findById(userId);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.isBanned) {
      throw new ForbiddenException('Your account has been banned. Please contact support.');
    }

    return this.generateTokens(user);
  }

  async loginWithOAuth(user: any) {
    // OAuth providers (Google, GitHub) have their own 2FA
    // So we bypass our 2FA for OAuth logins
    return this.generateTokens(user);
  }

  private async generateTokens(user: any) {
    const payload = { 
      email: user.email, 
      sub: user._id,
      username: user.username,
      role: user.role 
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    // Hash and store refresh token
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.userModel.findByIdAndUpdate(user._id, {
      refreshToken: hashedRefreshToken,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        statistics: user.statistics,
      },
    };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.userModel.findById(userId);
    
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    if (user.isBanned) {
      throw new ForbiddenException('Your account has been banned. Please contact support.');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Access denied');
    }

    const payload = {
      email: user.email,
      sub: user._id,
      username: user.username,
      role: user.role,
    };

    const newAccessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '15m',
    });

    const newRefreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    await this.userModel.findByIdAndUpdate(userId, {
      refreshToken: hashedRefreshToken,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(userId: string) {
    await this.userModel.findByIdAndUpdate(userId, {
      refreshToken: undefined,
    });
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(email: string): Promise<{ message: string; resetToken?: string }> {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      // Return error if user doesn't exist
      throw new BadRequestException('No account found with this email address');
    }

    // Generate reset token (6-digit code)
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedToken = await bcrypt.hash(resetToken, 10);

    // Token expires in 1 hour
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = expiresAt;
    await user.save();

    // Send email with reset token
    try {
      await this.emailService.sendPasswordResetEmail(email, resetToken, user.username);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      // Continue even if email fails - user can still use the token if returned in dev mode
    }

    // In development, return the token. In production, don't return it
    if (this.configService.get('NODE_ENV') === 'development') {
      return {
        message: 'Password reset code sent to your email',
        resetToken, // Only for development
      };
    }

    return { message: 'Password reset code sent to your email' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    // Find users with non-expired reset tokens
    const users = await this.userModel.find({
      passwordResetExpires: { $gt: new Date() },
    });
    const now = new Date();

    let matchedUser: UserDocument | null = null;

    // Check token against all users with valid expiry
    for (const user of users) {
      if (!user.passwordResetToken || !user.passwordResetExpires || user.passwordResetExpires <= now) {
        continue;
      }

      const isTokenValid = await bcrypt.compare(token, user.passwordResetToken);
      if (isTokenValid) {
        matchedUser = user;
        break;
      }
    }

    if (!matchedUser) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    matchedUser.passwordHash = hashedPassword;
    matchedUser.passwordResetToken = undefined;
    matchedUser.passwordResetExpires = undefined;
    matchedUser.refreshToken = undefined;
    await matchedUser.save();

    return { message: 'Password has been reset successfully' };
  }

  async verifyResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
    const users = await this.userModel.find({
      passwordResetExpires: { $gt: new Date() },
    });
    const now = new Date();

    for (const user of users) {
      if (!user.passwordResetToken || !user.passwordResetExpires || user.passwordResetExpires <= now) {
        continue;
      }

      const isTokenValid = await bcrypt.compare(token, user.passwordResetToken);
      if (isTokenValid) {
        return { valid: true, email: user.email };
      }
    }

    return { valid: false };
  }

  // ============================================================================
  // OAUTH METHODS
  // ============================================================================

  async validateOAuthUser(profile: any): Promise<any> {
    const { email, providerId, provider, username, avatar } = profile;

    // Check if user exists with this provider
    let user = await this.userModel.findOne({
      providerId,
      provider,
    });

    let isNewUser = false;

    if (user) {
      // User exists, update last login
      user.updatedAt = new Date();
      if (avatar && !user.profile.avatar) {
        user.profile.avatar = avatar;
      }
      await user.save();
    } else {
      // Check if email already exists with different provider
      const existingUser = await this.userModel.findOne({ email });
      
      if (existingUser) {
        // Link OAuth account to existing user
        existingUser.providerId = providerId;
        existingUser.provider = provider;
        if (avatar && !existingUser.profile.avatar) {
          existingUser.profile.avatar = avatar;
        }
        await existingUser.save();
        user = existingUser;
      } else {
        // Create new user
        isNewUser = true;
        user = new this.userModel({
          email,
          username: await this.generateUniqueUsername(username),
          providerId,
          provider,
          providerAvatar: avatar,
          isEmailVerified: true, // OAuth emails are pre-verified
          profile: {
            avatar: avatar,
          },
          statistics: {
            totalPoints: 0,
            level: 1,
            currentStreak: 0,
            xp: 0,
            challengesCompleted: 0,
            challengesAttempted: 0,
            successRate: 0,
            totalTimeCoding: 0,
          },
          achievements: [],
          badges: [],
        });
        await user.save();

        // 📢 Emit user.created event for new OAuth users
        await this.rabbitMQService.emitUserCreated({
          userId: user._id.toString(),
          username: user.username,
          email: user.email,
          provider,
        });

        this.logger.log(`📢 User created event emitted for ${user.username} (OAuth)`);
      }
    }

    const { passwordHash, refreshToken, ...result } = user.toObject();
    return result;
  }

  private async generateUniqueUsername(baseUsername: string): Promise<string> {
    let username = baseUsername;
    let counter = 1;

    while (await this.userModel.findOne({ username })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    return username;
  }
}
