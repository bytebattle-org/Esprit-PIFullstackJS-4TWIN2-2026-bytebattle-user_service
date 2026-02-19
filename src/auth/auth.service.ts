import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
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

    const { passwordHash, refreshToken, ...result } = user.toObject();
    return result;
  }

  async login(user: any) {
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
      refreshToken: null,
    });
    return { message: 'Logged out successfully' };
  }

  // ============================================================================
  // OAUTH METHODS - COMMENTED OUT FOR LATER
  // ============================================================================
  // Uncomment these methods when enabling OAuth authentication
  // ============================================================================

  /*
  async validateOAuthUser(profile: any): Promise<any> {
    const { email, providerId, provider, username, avatar } = profile;

    // Check if user exists with this provider
    let user = await this.userModel.findOne({
      providerId,
      provider,
    });

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
            successRate: 0,
            totalTimeCoding: 0,
          },
          achievements: [],
          badges: [],
        });
        await user.save();
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
  */
}
