import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { User, UserDocument } from '../users/schemas/user.schema';
import { EmailService } from '../email/email.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

// Mock bcrypt at the module level
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const bcrypt = require('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userModel: Model<UserDocument>;
  let jwtService: JwtService;
  let configService: ConfigService;
  let emailService: EmailService;
  let rabbitMQService: RabbitMQService;

  const mockUser = {
    _id: 'user123',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashedPassword',
    isEmailVerified: true,
    isBanned: false,
    role: 'user',
    profile: {},
    statistics: { totalPoints: 0, level: 1 },
    refreshToken: null,
    isTwoFactorEnabled: false,
    toObject: jest.fn().mockReturnThis(),
    save: jest.fn().mockResolvedValue(this),
  };

  const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    find: jest.fn(),
    new: jest.fn(),
    constructor: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        NODE_ENV: 'test',
      };
      return config[key];
    }),
  };

  const mockEmailService = {
    sendPasswordResetEmail: jest.fn(),
    sendVerificationEmail: jest.fn(),
    sendWelcomeEmail: jest.fn(),
  };

  const mockRabbitMQService = {
    emitUserLoggedIn: jest.fn(),
    emitUserCreated: jest.fn(),
    subscribe: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: RabbitMQService,
          useValue: mockRabbitMQService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
    emailService = module.get<EmailService>(EmailService);
    rabbitMQService = module.get<RabbitMQService>(RabbitMQService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should validate user with correct credentials', async () => {
      const hashedPassword = 'hashedPassword123';
      const user = {
        ...mockUser,
        passwordHash: hashedPassword,
        toObject: jest.fn().mockReturnValue({
          _id: 'user123',
          username: 'testuser',
          email: 'test@example.com',
          isEmailVerified: true,
          isBanned: false,
        }),
      };

      mockUserModel.findOne.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toBeDefined();
      expect(result.email).toBe('test@example.com');
      expect(result.passwordHash).toBeUndefined();
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      await expect(service.validateUser('wrong@example.com', 'password123'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockUserModel.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await expect(service.validateUser('test@example.com', 'wrongpassword'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if email not verified', async () => {
      const unverifiedUser = { ...mockUser, isEmailVerified: false };
      mockUserModel.findOne.mockResolvedValue(unverifiedUser);
      bcrypt.compare.mockResolvedValue(true);

      await expect(service.validateUser('test@example.com', 'password123'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user is banned', async () => {
      const bannedUser = { ...mockUser, isBanned: true };
      mockUserModel.findOne.mockResolvedValue(bannedUser);
      bcrypt.compare.mockResolvedValue(true);

      await expect(service.validateUser('test@example.com', 'password123'))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('login', () => {
    it('should return tokens for user without 2FA', async () => {
      const user = { ...mockUser, isTwoFactorEnabled: false };
      mockJwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      bcrypt.hash.mockResolvedValue('hashed-refresh-token');
      mockUserModel.findByIdAndUpdate.mockResolvedValue(user);

      const result = await service.login(user);

      // Type guard: check if result has accessToken (not 2FA response)
      if ('accessToken' in result) {
        expect(result.accessToken).toBe('access-token');
        expect(result.refreshToken).toBe('refresh-token');
        expect(result.user).toBeDefined();
      } else {
        fail('Expected login result with tokens, got 2FA response');
      }
      expect(mockRabbitMQService.emitUserLoggedIn).toHaveBeenCalled();
    });

    it('should require 2FA if enabled', async () => {
      const user = { ...mockUser, isTwoFactorEnabled: true };

      const result = await service.login(user);

      // Type guard: check if result requires 2FA
      if ('requiresTwoFactor' in result) {
        expect(result.requiresTwoFactor).toBe(true);
        expect(result.userId).toBe('user123');
        expect('accessToken' in result).toBe(false);
      } else {
        fail('Expected 2FA response, got login result with tokens');
      }
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const hashedRefreshToken = 'hashed-refresh-token';
      const user = { ...mockUser, refreshToken: hashedRefreshToken };
      
      mockUserModel.findById.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('new-hashed-refresh-token');
      mockJwtService.sign.mockReturnValueOnce('new-access-token').mockReturnValueOnce('new-refresh-token');
      mockUserModel.findByIdAndUpdate.mockResolvedValue(user);

      const result = await service.refreshTokens('user123', 'valid-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await expect(service.refreshTokens('user123', 'token'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token does not match', async () => {
      const user = { ...mockUser, refreshToken: 'different-token' };
      mockUserModel.findById.mockResolvedValue(user);
      bcrypt.compare.mockResolvedValue(false);

      await expect(service.refreshTokens('user123', 'invalid-token'))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException if user is banned', async () => {
      const bannedUser = { ...mockUser, isBanned: true, refreshToken: 'token' };
      mockUserModel.findById.mockResolvedValue(bannedUser);

      await expect(service.refreshTokens('user123', 'token'))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('logout', () => {
    it('should clear refresh token on logout', async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValue(mockUser);

      const result = await service.logout('user123');

      expect(result.message).toBe('Logged out successfully');
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith('user123', {
        refreshToken: undefined,
      });
    });
  });

  describe('forgotPassword', () => {
    it('should generate reset token and send email', async () => {
      const user = { ...mockUser, save: jest.fn().mockResolvedValue(mockUser) };
      mockUserModel.findOne.mockResolvedValue(user);
      bcrypt.hash.mockResolvedValue('hashed-token');
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      const result = await service.forgotPassword('test@example.com');

      expect(result.message).toBe('Password reset code sent to your email');
      expect(user.save).toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should throw BadRequestException if user not found', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      await expect(service.forgotPassword('nonexistent@example.com'))
        .rejects.toThrow(BadRequestException);
    });

    it('should return token in development mode', async () => {
      const user = { ...mockUser, save: jest.fn().mockResolvedValue(mockUser) };
      mockUserModel.findOne.mockResolvedValue(user);
      bcrypt.hash.mockResolvedValue('hashed-token');
      mockConfigService.get = jest.fn().mockReturnValue('development');

      const result = await service.forgotPassword('test@example.com');

      expect(result.resetToken).toBeDefined();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const futureDate = new Date(Date.now() + 3600000);
      const user = {
        ...mockUser,
        passwordResetToken: 'hashed-token',
        passwordResetExpires: futureDate,
        save: jest.fn().mockResolvedValue(mockUser),
      };

      mockUserModel.find.mockResolvedValue([user]);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('new-hashed-password');

      const result = await service.resetPassword('valid-token', 'newPassword123');

      expect(result.message).toBe('Password has been reset successfully');
      expect(user.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if token is invalid', async () => {
      mockUserModel.find.mockResolvedValue([]);

      await expect(service.resetPassword('invalid-token', 'newPassword123'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if token is expired', async () => {
      const pastDate = new Date(Date.now() - 3600000);
      const user = {
        ...mockUser,
        passwordResetToken: 'hashed-token',
        passwordResetExpires: pastDate,
      };

      // Mock find to return empty array (expired tokens are filtered out by query)
      mockUserModel.find.mockResolvedValue([]);

      await expect(service.resetPassword('token', 'newPassword123'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('validateOAuthUser', () => {
    it('should update existing OAuth user', async () => {
      const profile = {
        email: 'oauth@example.com',
        providerId: 'google123',
        provider: 'google',
        username: 'oauthuser',
        avatar: 'https://avatar.url',
      };

      const existingUser = {
        ...mockUser,
        email: profile.email,
        providerId: profile.providerId,
        provider: profile.provider,
        save: jest.fn().mockResolvedValue(mockUser),
        toObject: jest.fn().mockReturnValue({ ...mockUser }),
      };

      mockUserModel.findOne.mockResolvedValueOnce(existingUser);

      const result = await service.validateOAuthUser(profile);

      expect(result).toBeDefined();
      expect(existingUser.save).toHaveBeenCalled();
    });
  });
});
