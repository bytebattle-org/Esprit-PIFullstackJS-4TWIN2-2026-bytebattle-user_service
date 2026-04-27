import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { DailyChallengeService } from './daily-challenge.service';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;
  let dailyChallengeService: DailyChallengeService;

  const mockUsersService = {
    create: jest.fn(),
    verifyEmail: jest.fn(),
    resendVerificationCode: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByUsername: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    updateStats: jest.fn(),
    addAchievement: jest.fn(),
    addBadge: jest.fn(),
    getLeaderboard: jest.fn(),
    searchUsers: jest.fn(),
    getFriends: jest.fn(),
    getFriendRequests: jest.fn(),
    sendFriendRequest: jest.fn(),
    acceptFriendRequest: jest.fn(),
    rejectFriendRequest: jest.fn(),
    getAdminAnalytics: jest.fn(),
    updateRole: jest.fn(),
    updateStatus: jest.fn(),
    resetPasswordAdmin: jest.fn(),
    getTodayDailyChallenge: jest.fn(),
    completeDailyChallenge: jest.fn(),
    getUserDailyChallengeStats: jest.fn(),
    recalculateAllLevels: jest.fn(),
  };

  const mockDailyChallengeService = {
    createDailyChallengeManually: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'INTERNAL_API_KEY') return 'test-internal-key';
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
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: DailyChallengeService,
          useValue: mockDailyChallengeService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
    dailyChallengeService = module.get<DailyChallengeService>(DailyChallengeService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
      };

      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(mockUser);
      expect(mockUsersService.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email', async () => {
      const body = { email: 'test@example.com', code: '123456' };
      const response = { message: 'Email verified successfully', user: mockUser };

      mockUsersService.verifyEmail.mockResolvedValue(response);

      const result = await controller.verifyEmail(body);

      expect(result).toEqual(response);
      expect(mockUsersService.verifyEmail).toHaveBeenCalledWith(body.email, body.code);
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [mockUser, { ...mockUser, _id: 'user456' }];
      mockUsersService.findAll.mockResolvedValue(users);

      const result = await controller.findAll();

      expect(result).toEqual(users);
      expect(mockUsersService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne('user123');

      expect(result).toEqual(mockUser);
      expect(mockUsersService.findOne).toHaveBeenCalledWith('user123');
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateDto = { username: 'updateduser' };
      const updatedUser = { ...mockUser, ...updateDto };

      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.update('user123', updateDto);

      expect(result).toEqual(updatedUser);
      expect(mockUsersService.update).toHaveBeenCalledWith('user123', updateDto);
    });
  });

  describe('remove', () => {
    it('should allow user to delete their own account', async () => {
      const req = {
        user: { userId: 'user123', role: 'user' },
      };

      mockUsersService.remove.mockResolvedValue(undefined);

      await controller.remove('user123', req);

      expect(mockUsersService.remove).toHaveBeenCalledWith('user123');
    });

    it('should allow admin to delete any account', async () => {
      const req = {
        user: { userId: 'admin123', role: 'admin' },
      };

      mockUsersService.remove.mockResolvedValue(undefined);

      await controller.remove('user123', req);

      expect(mockUsersService.remove).toHaveBeenCalledWith('user123');
    });

    it('should throw ForbiddenException if user tries to delete another account', async () => {
      const req = {
        user: { userId: 'user456', role: 'user' },
      };

      await expect(async () => {
        await controller.remove('user123', req);
      }).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateStats', () => {
    it('should update user statistics', async () => {
      const stats = { xp: 50, challengesCompleted: 1 };
      const updatedUser = { ...mockUser, statistics: { ...mockUser.statistics, xp: 50 } };

      mockUsersService.updateStats.mockResolvedValue(updatedUser);

      const result = await controller.updateStats('user123', stats);

      expect(result).toEqual(updatedUser);
      expect(mockUsersService.updateStats).toHaveBeenCalledWith('user123', stats);
    });
  });

  describe('updateStatsInternal', () => {
    it('should update stats with valid internal API key', async () => {
      const stats = { xp: 50 };
      const updatedUser = { ...mockUser };

      mockUsersService.updateStats.mockResolvedValue(updatedUser);

      const result = await controller.updateStatsInternal('user123', 'test-internal-key', stats);

      expect(result).toEqual(updatedUser);
      expect(mockUsersService.updateStats).toHaveBeenCalledWith('user123', stats);
    });

    it('should throw UnauthorizedException with invalid API key', async () => {
      const stats = { xp: 50 };

      await expect(async () => {
        await controller.updateStatsInternal('user123', 'wrong-key', stats);
      }).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getLeaderboard', () => {
    it('should return leaderboard with default limit', async () => {
      const users = [mockUser];
      mockUsersService.getLeaderboard.mockResolvedValue(users);

      const result = await controller.getLeaderboard();

      expect(result).toEqual(users);
      expect(mockUsersService.getLeaderboard).toHaveBeenCalledWith(10);
    });

    it('should return leaderboard with custom limit', async () => {
      const users = [mockUser];
      mockUsersService.getLeaderboard.mockResolvedValue(users);

      const result = await controller.getLeaderboard('20');

      expect(result).toEqual(users);
      expect(mockUsersService.getLeaderboard).toHaveBeenCalledWith(20);
    });
  });

  describe('searchUsers', () => {
    it('should search users', async () => {
      const users = { users: [mockUser] };
      mockUsersService.searchUsers.mockResolvedValue(users);

      const result = await controller.searchUsers('test');

      expect(result).toEqual(users);
      expect(mockUsersService.searchUsers).toHaveBeenCalledWith('test');
    });
  });

  describe('Friend System', () => {
    describe('getFriends', () => {
      it('should get user friends', async () => {
        const friends = { friends: [mockUser] };
        mockUsersService.getFriends.mockResolvedValue(friends);

        const result = await controller.getFriends('user123');

        expect(result).toEqual(friends);
        expect(mockUsersService.getFriends).toHaveBeenCalledWith('user123');
      });
    });

    describe('sendFriendRequest', () => {
      it('should send friend request', async () => {
        const body = { fromUserId: 'user123', toUserId: 'user456' };
        const response = { message: 'Friend request sent successfully' };

        mockUsersService.sendFriendRequest.mockResolvedValue(response);

        const result = await controller.sendFriendRequest(body);

        expect(result).toEqual(response);
        expect(mockUsersService.sendFriendRequest).toHaveBeenCalledWith('user123', 'user456');
      });
    });

    describe('acceptFriendRequest', () => {
      it('should accept friend request', async () => {
        const response = { message: 'Friend request accepted' };
        mockUsersService.acceptFriendRequest.mockResolvedValue(response);

        const result = await controller.acceptFriendRequest('request123', {});

        expect(result).toEqual(response);
        expect(mockUsersService.acceptFriendRequest).toHaveBeenCalledWith('request123');
      });
    });
  });

  describe('Admin Routes', () => {
    describe('getAnalytics', () => {
      it('should return admin analytics', async () => {
        const analytics = { totalUsers: 100, activeUsers: 50 };
        mockUsersService.getAdminAnalytics.mockResolvedValue(analytics);

        const result = await controller.getAnalytics();

        expect(result).toEqual(analytics);
        expect(mockUsersService.getAdminAnalytics).toHaveBeenCalled();
      });
    });

    describe('updateRole', () => {
      it('should update user role', async () => {
        const updatedUser = { ...mockUser, role: 'admin' };
        mockUsersService.updateRole.mockResolvedValue(updatedUser);

        const result = await controller.updateRole('user123', 'admin');

        expect(result).toEqual(updatedUser);
        expect(mockUsersService.updateRole).toHaveBeenCalledWith('user123', 'admin');
      });
    });

    describe('updateStatus', () => {
      it('should update user status', async () => {
        const updatedUser = { ...mockUser, isBanned: true };
        mockUsersService.updateStatus.mockResolvedValue(updatedUser);

        const result = await controller.updateStatus('user123', true);

        expect(result).toEqual(updatedUser);
        expect(mockUsersService.updateStatus).toHaveBeenCalledWith('user123', true);
      });
    });
  });

  describe('Daily Challenge', () => {
    describe('completeDailyChallenge', () => {
      it('should complete daily challenge', async () => {
        const req = { user: { userId: 'user123' } };
        const response = {
          message: 'Daily challenge completed successfully',
          streak: 1,
          bonusXp: 50,
        };

        mockUsersService.completeDailyChallenge.mockResolvedValue(response);

        const result = await controller.completeDailyChallenge('user123', 'challenge123', req);

        expect(result).toEqual(response);
        expect(mockUsersService.completeDailyChallenge).toHaveBeenCalledWith('user123', 'challenge123');
      });

      it('should throw ForbiddenException if user tries to complete another user challenge', async () => {
        const req = { user: { userId: 'user456' } };

        await expect(async () => {
          await controller.completeDailyChallenge('user123', 'challenge123', req);
        }).rejects.toThrow(ForbiddenException);
      });
    });

    describe('getUserDailyChallengeStats', () => {
      it('should get user daily challenge stats', async () => {
        const stats = {
          currentStreak: 5,
          longestStreak: 10,
          totalDailyChallengesCompleted: 20,
        };

        mockUsersService.getUserDailyChallengeStats.mockResolvedValue(stats);

        const result = await controller.getUserDailyChallengeStats('user123');

        expect(result).toEqual(stats);
        expect(mockUsersService.getUserDailyChallengeStats).toHaveBeenCalledWith('user123');
      });
    });
  });

  describe('recalculateLevels', () => {
    it('should recalculate levels with valid API key', async () => {
      const response = { updated: 10, errors: 0 };
      mockUsersService.recalculateAllLevels.mockResolvedValue(response);

      const result = await controller.recalculateLevels('test-internal-key');

      expect(result).toEqual(response);
      expect(mockUsersService.recalculateAllLevels).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException with invalid API key', async () => {
      await expect(async () => {
        await controller.recalculateLevels('wrong-key');
      }).rejects.toThrow(UnauthorizedException);
    });
  });
});
