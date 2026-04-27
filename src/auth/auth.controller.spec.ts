import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let usersService: UsersService;

  const mockAuthService = {
    validateUser: jest.fn(),
    login: jest.fn(),
    loginWith2FA: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    verifyResetToken: jest.fn(),
  };

  const mockUsersService = {
    create: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerificationCode: jest.fn(),
    findOne: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'INTERNAL_API_KEY') return 'test-key';
      return null;
    }),
  };

  const mockUser = {
    _id: 'user123',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user',
    profile: {},
    statistics: { totalPoints: 0, level: 1 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should login user and return tokens', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: mockUser,
      };

      mockAuthService.validateUser.mockResolvedValue(mockUser);
      mockAuthService.login.mockResolvedValue(tokens);

      const result = await controller.login(loginDto);

      expect(result).toEqual(tokens);
      expect(mockAuthService.validateUser).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('refresh', () => {
    it('should refresh access token', async () => {
      const req = {
        user: { userId: 'user123', refreshToken: 'old-refresh-token' },
      };

      const tokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockAuthService.refreshTokens.mockResolvedValue(tokens);

      const result = await controller.refresh(req);

      expect(result).toEqual(tokens);
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(
        'user123',
        'old-refresh-token',
      );
    });
  });

  describe('logout', () => {
    it('should logout user', async () => {
      const req = {
        user: { userId: 'user123' },
      };

      const response = { message: 'Logged out successfully' };
      mockAuthService.logout.mockResolvedValue(response);

      const result = await controller.logout(req);

      expect(result).toEqual(response);
      expect(mockAuthService.logout).toHaveBeenCalledWith('user123');
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email', async () => {
      const email = 'test@example.com';
      const response = { message: 'Password reset code sent to your email' };

      mockAuthService.forgotPassword.mockResolvedValue(response);

      const result = await controller.forgotPassword(email);

      expect(result).toEqual(response);
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(email);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const req = {
        user: mockUser,
      };

      const result = await controller.getProfile(req);

      expect(result).toEqual(mockUser);
    });
  });
});
