import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { User, UserDocument } from './schemas/user.schema';
import { DailyChallenge, DailyChallengeDocument } from './schemas/daily-challenge.schema';
import { EmailService } from '../email/email.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

// Mock bcrypt at the module level
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const bcrypt = require('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let userModel: Model<UserDocument>;
  let dailyChallengeModel: Model<DailyChallengeDocument>;
  let emailService: EmailService;
  let rabbitMQService: RabbitMQService;

  const mockUser = {
    _id: 'user123',
    username: 'testuser',
    email: 'test@example.com',
    passwordHash: 'hashedPassword',
    isEmailVerified: false,
    verificationCode: '123456',
    verificationCodeExpires: new Date(Date.now() + 900000),
    role: 'user',
    provider: 'local',
    statistics: {
      totalPoints: 100,
      level: 1,
      xp: 100,
      challengesCompleted: 5,
      challengesAttempted: 10,
      successRate: 50,
      currentStreak: 0,
      totalTimeCoding: 0,
    },
    dailyChallenge: {
      currentStreak: 0,
      longestStreak: 0,
      totalDailyChallengesCompleted: 0,
    },
    profile: {},
    achievements: [],
    badges: [],
    friends: [],
    friendRequests: [],
    toObject: jest.fn().mockReturnThis(),
    save: jest.fn().mockResolvedValue(this),
  };

  const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    new: jest.fn(),
    constructor: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    exec: jest.fn(),
  };

  const mockDailyChallengeModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn(),
    sendWelcomeEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  };

  const mockRabbitMQService = {
    emitUserCreated: jest.fn(),
    emitUserLoggedIn: jest.fn(),
    subscribe: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(DailyChallenge.name),
          useValue: mockDailyChallengeModel,
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

    service = module.get<UsersService>(UsersService);
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    dailyChallengeModel = module.get<Model<DailyChallengeDocument>>(getModelToken(DailyChallenge.name));
    emailService = module.get<EmailService>(EmailService);
    rabbitMQService = module.get<RabbitMQService>(RabbitMQService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
      };

      mockUserModel.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashedPassword');

      const newUser = {
        ...mockUser,
        ...createUserDto,
        save: jest.fn().mockResolvedValue(mockUser),
      };

      mockUserModel.mockImplementation(() => newUser);

      const result = await service.create(createUserDto);

      expect(result).toBeDefined();
      expect(mockRabbitMQService.emitUserCreated).toHaveBeenCalled();
    });

    it('should throw ConflictException if username exists', async () => {
      const createUserDto = {
        username: 'existinguser',
        email: 'new@example.com',
        password: 'password123',
      };

      mockUserModel.findOne.mockResolvedValue(mockUser);

      await expect(service.create(createUserDto))
        .rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if email exists', async () => {
      const createUserDto = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'password123',
      };

      mockUserModel.findOne.mockResolvedValue(mockUser);

      await expect(service.create(createUserDto))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid code', async () => {
      const user = {
        ...mockUser,
        isEmailVerified: false,
        verificationCode: '123456',
        verificationCodeExpires: new Date(Date.now() + 900000),
        save: jest.fn().mockResolvedValue(mockUser),
        toObject: jest.fn().mockReturnValue({ ...mockUser }),
      };

      mockUserModel.findOne.mockResolvedValue(user);
      mockEmailService.sendWelcomeEmail.mockResolvedValue(undefined);

      const result = await service.verifyEmail('test@example.com', '123456');

      expect(result.message).toBe('Email verified successfully');
      expect(user.save).toHaveBeenCalled();
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail('nonexistent@example.com', '123456'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already verified', async () => {
      const verifiedUser = { ...mockUser, isEmailVerified: true };
      mockUserModel.findOne.mockResolvedValue(verifiedUser);

      await expect(service.verifyEmail('test@example.com', '123456'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if code is invalid', async () => {
      const user = {
        ...mockUser,
        verificationCode: '123456',
        verificationCodeExpires: new Date(Date.now() + 900000),
      };
      mockUserModel.findOne.mockResolvedValue(user);

      await expect(service.verifyEmail('test@example.com', 'wrongcode'))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if code is expired', async () => {
      const user = {
        ...mockUser,
        verificationCode: '123456',
        verificationCodeExpires: new Date(Date.now() - 1000),
      };
      mockUserModel.findOne.mockResolvedValue(user);

      await expect(service.verifyEmail('test@example.com', '123456'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all users without passwords', async () => {
      const users = [mockUser, { ...mockUser, _id: 'user456' }];
      const selectMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(users);

      mockUserModel.find.mockReturnValue({
        select: selectMock,
        exec: execMock,
      } as any);

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(selectMock).toHaveBeenCalledWith('-passwordHash');
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const selectMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(mockUser);

      mockUserModel.findById.mockReturnValue({
        select: selectMock,
        exec: execMock,
      } as any);

      const result = await service.findOne('user123');

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      const selectMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(null);

      mockUserModel.findById.mockReturnValue({
        select: selectMock,
        exec: execMock,
      } as any);

      await expect(service.findOne('nonexistent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update user profile', async () => {
      const updateDto = {
        username: 'updateduser',
        avatar: 'https://avatar.url',
        bio: 'New bio',
      };

      const selectMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue({ ...mockUser, ...updateDto });

      mockUserModel.findByIdAndUpdate.mockReturnValue({
        select: selectMock,
        exec: execMock,
      } as any);

      const result = await service.update('user123', updateDto);

      expect(result).toBeDefined();
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should hash password when updating', async () => {
      const updateDto = { password: 'newpassword123' };
      bcrypt.hash.mockResolvedValue('newHashedPassword');

      const selectMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(mockUser);

      mockUserModel.findByIdAndUpdate.mockReturnValue({
        select: selectMock,
        exec: execMock,
      } as any);

      await service.update('user123', updateDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
    });
  });

  describe('remove', () => {
    it('should delete a user', async () => {
      const execMock = jest.fn().mockResolvedValue(mockUser);
      mockUserModel.findByIdAndDelete.mockReturnValue({
        exec: execMock,
      } as any);

      await service.remove('user123');

      expect(mockUserModel.findByIdAndDelete).toHaveBeenCalledWith('user123');
    });

    it('should throw NotFoundException if user not found', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      mockUserModel.findByIdAndDelete.mockReturnValue({
        exec: execMock,
      } as any);

      await expect(service.remove('nonexistent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStats', () => {
    it('should update user statistics', async () => {
      const stats = {
        xp: 50,
        challengesCompleted: 1,
        challengesAttempted: 1,
      };

      const updatedUser = {
        ...mockUser,
        statistics: {
          ...mockUser.statistics,
          xp: 150,
          challengesCompleted: 6,
          challengesAttempted: 11,
        },
        save: jest.fn().mockResolvedValue(mockUser),
      };

      const selectMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(updatedUser);

      mockUserModel.findByIdAndUpdate.mockReturnValue({
        select: selectMock,
        exec: execMock,
      } as any);

      const result = await service.updateStats('user123', stats);

      expect(result).toBeDefined();
      expect(updatedUser.save).toHaveBeenCalled();
    });

    it('should recalculate success rate', async () => {
      const stats = {
        challengesCompleted: 1,
        challengesAttempted: 1,
      };

      const updatedUser = {
        ...mockUser,
        statistics: {
          ...mockUser.statistics,
          challengesCompleted: 6,
          challengesAttempted: 11,
        },
        save: jest.fn().mockResolvedValue(mockUser),
      };

      const selectMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(updatedUser);

      mockUserModel.findByIdAndUpdate.mockReturnValue({
        select: selectMock,
        exec: execMock,
      } as any);

      await service.updateStats('user123', stats);

      expect(updatedUser.save).toHaveBeenCalled();
    });
  });

  describe('getLeaderboard', () => {
    it('should return top users sorted by XP', async () => {
      const users = [
        { ...mockUser, statistics: { ...mockUser.statistics, xp: 1000 } },
        { ...mockUser, _id: 'user456', statistics: { ...mockUser.statistics, xp: 800 } },
      ];

      const selectMock = jest.fn().mockReturnThis();
      const sortMock = jest.fn().mockReturnThis();
      const limitMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(users);

      mockUserModel.find.mockReturnValue({
        select: selectMock,
        sort: sortMock,
        limit: limitMock,
        exec: execMock,
      } as any);

      const result = await service.getLeaderboard(10);

      expect(result).toEqual(users);
      expect(sortMock).toHaveBeenCalledWith({ 'statistics.xp': -1, 'statistics.totalPoints': -1 });
    });
  });

  describe('Friend System', () => {
    describe('searchUsers', () => {
      it('should search users by username or email', async () => {
        const users = [mockUser];
        const selectMock = jest.fn().mockReturnThis();
        const limitMock = jest.fn().mockReturnThis();
        const execMock = jest.fn().mockResolvedValue(users);

        mockUserModel.find.mockReturnValue({
          select: selectMock,
          limit: limitMock,
          exec: execMock,
        } as any);

        const result = await service.searchUsers('test');

        expect(result.users).toEqual(users);
      });

      it('should return empty array for short query', async () => {
        const result = await service.searchUsers('a');
        expect(result.users).toEqual([]);
      });
    });

    describe('sendFriendRequest', () => {
      it('should send friend request', async () => {
        const fromUser = { ...mockUser, friends: [] };
        const toUser = {
          ...mockUser,
          _id: 'user456',
          friendRequests: [],
          save: jest.fn().mockResolvedValue(mockUser),
        };

        mockUserModel.findById
          .mockResolvedValueOnce(toUser)
          .mockResolvedValueOnce(fromUser);

        const result = await service.sendFriendRequest('user123', 'user456');

        expect(result.message).toBe('Friend request sent successfully');
        expect(toUser.save).toHaveBeenCalled();
      });

      it('should throw BadRequestException if trying to add self', async () => {
        await expect(service.sendFriendRequest('user123', 'user123'))
          .rejects.toThrow(BadRequestException);
      });

      it('should throw NotFoundException if target user not found', async () => {
        mockUserModel.findById.mockResolvedValue(null);

        await expect(service.sendFriendRequest('user123', 'nonexistent'))
          .rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('Daily Challenge', () => {
    describe('completeDailyChallenge', () => {
      it('should complete daily challenge and update streak', async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dailyChallenge = {
          _id: 'challenge123',
          challengeId: 'ch123',
          date: today,
          bonusXp: 50,
          completedBy: [],
          save: jest.fn().mockResolvedValue(this),
        };

        const user = {
          ...mockUser,
          dailyChallenge: {
            currentStreak: 0,
            longestStreak: 0,
            totalDailyChallengesCompleted: 0,
          },
          statistics: { ...mockUser.statistics },
          save: jest.fn().mockResolvedValue(mockUser),
        };

        mockDailyChallengeModel.findOne.mockResolvedValue(dailyChallenge);
        mockUserModel.findById.mockResolvedValue(user);

        const result = await service.completeDailyChallenge('user123', 'ch123');

        expect(result.message).toBe('Daily challenge completed successfully');
        expect(result.streak).toBe(1);
        expect(user.save).toHaveBeenCalled();
        expect(dailyChallenge.save).toHaveBeenCalled();
      });

      it('should throw NotFoundException if no daily challenge exists', async () => {
        mockDailyChallengeModel.findOne.mockResolvedValue(null);

        await expect(service.completeDailyChallenge('user123', 'ch123'))
          .rejects.toThrow(NotFoundException);
      });
    });
  });
});
