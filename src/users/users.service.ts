import { Injectable, ConflictException, NotFoundException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, FriendRequest } from './schemas/user.schema';
import { DailyChallenge, DailyChallengeDocument } from './schemas/daily-challenge.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { EmailService } from '../email/email.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(DailyChallenge.name) private dailyChallengeModel: Model<DailyChallengeDocument>,
    private emailService: EmailService,
    private readonly rabbitMQService: RabbitMQService,
  ) { }

  async onModuleInit() {
    // 📥 Subscribe to RabbitMQ events
    await this.rabbitMQService.subscribe(async (routingKey, data) => {
      try {
        switch (routingKey) {
          case 'battle.finished':
            await this.handleBattleFinished(data);
            break;
          case 'battle.started':
            await this.handleBattleStarted(data);
            break;
          default:
            this.logger.debug(`Unhandled event: ${routingKey}`);
        }
      } catch (error) {
        this.logger.error(`Error handling event ${routingKey}:`, error);
        throw error; // Re-throw to trigger message requeue
      }
    });

    this.logger.log('✅ User Service subscribed to RabbitMQ events');
  }

  /**
   * Handle battle.finished event - Update user stats
   */
  private async handleBattleFinished(data: any): Promise<void> {
    this.logger.log(`📥 Handling battle.finished event for battle ${data.battleId}`);
    this.logger.log(
      `Battle finished payload received with ${data.participants?.length || 0} participants and winner team ${data.winnerTeam || 'n/a'}`,
    );
  }

  /**
   * Handle battle.started event - Mark users as in-game
   */
  private async handleBattleStarted(data: any): Promise<void> {
    this.logger.log(`📥 Handling battle.started event for battle ${data.battleId}`);
    
    // You can add logic here to mark users as "in-game" if needed
    // For now, just log it
    this.logger.log(`Battle started with ${data.participants.length} participants`);
  }

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { username, email, password } = createUserDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    // Hash password (only for local auth)
    const passwordHash = password ? await bcrypt.hash(password, 10) : undefined;

    // Generate verification code
    const verificationCode = this.generateVerificationCode();
    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const user = new this.userModel({
      username,
      email,
      passwordHash,
      verificationCode,
      verificationCodeExpires,
      isEmailVerified: false,
      provider: 'local',
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
      profile: {},
      achievements: [],
      badges: [],
    });

    await user.save();

    // 📢 Emit user.created event
    await this.rabbitMQService.emitUserCreated({
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
      provider: 'local',
    });

    this.logger.log(`📢 User created event emitted for ${user.username}`);

    // Fire-and-forget email so registration response is not blocked by SMTP latency.
    void this.emailService
      .sendVerificationEmail(email, verificationCode, username)
      .catch((error) => {
        console.error('Failed to send verification email:', error);
      });

    return user;
  }

  async verifyEmail(email: string, code: string): Promise<{ message: string; user: any }> {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    if (user.verificationCode !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    if (!user.verificationCodeExpires || user.verificationCodeExpires < new Date()) {
      throw new BadRequestException('Verification code expired');
    }

    user.isEmailVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    // Send welcome email
    try {
      await this.emailService.sendWelcomeEmail(email, user.username);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }

    const { passwordHash, ...userResponse } = user.toObject();

    return {
      message: 'Email verified successfully',
      user: userResponse,
    };
  }

  async resendVerificationCode(email: string): Promise<{ message: string }> {
    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const verificationCode = this.generateVerificationCode();
    const verificationCodeExpires = new Date(Date.now() + 15 * 60 * 1000);

    user.verificationCode = verificationCode;
    user.verificationCodeExpires = verificationCodeExpires;
    await user.save();

    try {
      await this.emailService.sendVerificationEmail(email, verificationCode, user.username);
    } catch (error) {
      console.error('Failed to resend verification email:', error);
      throw new BadRequestException('Failed to send verification email');
    }

    return { message: 'Verification code sent successfully' };
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().select('-passwordHash').exec();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findById(id).select('-passwordHash').exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const updateData: any = {};

    if (updateUserDto.username) updateData.username = updateUserDto.username;
    if (updateUserDto.email) updateData.email = updateUserDto.email;
    if (updateUserDto.password) {
      updateData.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Update profile fields
    if (updateUserDto.avatar || updateUserDto.bio || updateUserDto.preferredLanguages) {
      if (updateUserDto.avatar) updateData['profile.avatar'] = updateUserDto.avatar;
      if (updateUserDto.bio) updateData['profile.bio'] = updateUserDto.bio;
      if (updateUserDto.preferredLanguages) {
        updateData['profile.preferredLanguages'] = updateUserDto.preferredLanguages;
      }
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .select('-passwordHash')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  async updateStats(
    id: string,
    stats: {
      totalPoints?: number;
      level?: number;
      currentStreak?: number;
      xp?: number;
      challengesCompleted?: number;
      challengesAttempted?: number;
      successRate?: number;
      totalTimeCoding?: number;
    },
  ): Promise<User> {
    const updateData: any = {};

    Object.keys(stats).forEach((key) => {
      updateData[`statistics.${key}`] = stats[key];
    });

    const user = await this.userModel
      .findByIdAndUpdate(id, { $inc: updateData }, { new: true })
      .select('-passwordHash')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Recalculate level based on total XP/points
    if (stats.xp || stats.totalPoints) {
      const totalXp = user.statistics.xp || user.statistics.totalPoints || 0;
      const calculatedLevel = this.calculateLevelFromXp(totalXp);
      
      if (calculatedLevel !== user.statistics.level) {
        user.statistics.level = calculatedLevel;
      }
    }

    // Recalculate success rate
    if (stats.challengesCompleted || stats.challengesAttempted) {
      const completed = user.statistics.challengesCompleted || 0;
      const attempted = user.statistics.challengesAttempted || 0;
      
      if (attempted > 0) {
        user.statistics.successRate = Math.round((completed / attempted) * 100);
      } else {
        user.statistics.successRate = 0;
      }
    }

    // Save if we made any calculations
    if (stats.xp || stats.totalPoints || stats.challengesCompleted || stats.challengesAttempted) {
      await user.save();
    }

    return user;
  }

  // Helper function to calculate level from XP
  private calculateLevelFromXp(totalXp: number): number {
    const BASE_LEVEL_XP = 40;
    const LEVEL_MULTIPLIER = 1.3;
    
    let remainingXp = Math.max(0, Math.floor(totalXp));
    let level = 1;
    
    let neededForNext = Math.max(1, Math.round(BASE_LEVEL_XP * Math.pow(LEVEL_MULTIPLIER, level - 1)));
    while (remainingXp >= neededForNext) {
      remainingXp -= neededForNext;
      level += 1;
      neededForNext = Math.max(1, Math.round(BASE_LEVEL_XP * Math.pow(LEVEL_MULTIPLIER, level - 1)));
    }
    
    return level;
  }

  // Recalculate levels for all users based on their XP
  async recalculateAllLevels(): Promise<{ updated: number; errors: number }> {
    this.logger.log('🔄 Starting level recalculation for all users...');
    
    const users = await this.userModel.find().exec();
    let updated = 0;
    let errors = 0;
    
    for (const user of users) {
      try {
        const totalXp = user.statistics.xp || user.statistics.totalPoints || 0;
        const calculatedLevel = this.calculateLevelFromXp(totalXp);
        
        if (calculatedLevel !== user.statistics.level) {
          user.statistics.level = calculatedLevel;
          await user.save();
          updated++;
          this.logger.log(`✅ Updated ${user.username}: Level ${user.statistics.level} (${totalXp} XP)`);
        }
      } catch (error) {
        errors++;
        this.logger.error(`❌ Error updating ${user.username}:`, error);
      }
    }
    
    this.logger.log(`✅ Level recalculation complete: ${updated} updated, ${errors} errors`);
    return { updated, errors };
  }

  async addAchievement(
    id: string,
    achievement: {
      id: string;
      name: string;
      rarity: 'common' | 'rare' | 'epic' | 'legendary';
    },
  ): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        {
          $addToSet: {
            achievements: {
              ...achievement,
              unlockedAt: new Date(),
            },
          },
        },
        { new: true },
      )
      .select('-passwordHash')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async addBadge(id: string, badge: string): Promise<User> {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        { $addToSet: { badges: badge } },
        { new: true },
      )
      .select('-passwordHash')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getLeaderboard(limit: number = 10): Promise<User[]> {
    return this.userModel
      .find()
      .select('-passwordHash')
      .sort({ 'statistics.xp': -1, 'statistics.totalPoints': -1 })
      .limit(limit)
      .exec();
  }

  async getAdminAnalytics() {
    const totalUsers = await this.userModel.countDocuments();
    // Assuming active users are those who logged in last 30 days. No 'lastActiveAt' exists,
    // so let's mock it for now since we just have createdAt and updatedAt
    const activeUsers = await this.userModel.countDocuments({
      updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    return {
      totalUsers,
      activeUsers,
    };
  }

  async updateRole(id: string, role: string) {
    if (!['user', 'admin'].includes(role)) {
      throw new BadRequestException('Invalid role');
    }
    const user = await this.userModel.findByIdAndUpdate(id, { role }, { new: true }).select('-passwordHash').exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateStatus(id: string, isBanned: boolean) {
    const user = await this.userModel.findByIdAndUpdate(id, { isBanned }, { new: true }).select('-passwordHash').exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async resetPasswordAdmin(id: string, newPassword?: string) {
    const password = newPassword || Math.random().toString(36).slice(-8); // Generate random if not provided
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.userModel.findByIdAndUpdate(id, { passwordHash }, { new: true }).select('-passwordHash').exec();
    if (!user) throw new NotFoundException('User not found');

    // Optional: Email the user their new password
    // await this.emailService.sendPasswordResetAdmin(user.email, password);

    return { message: 'Password reset successfully', tempPassword: password };
  }

  // Friend System Methods

  async searchUsers(query: string) {
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return { users: [] };
    }

    const users = await this.userModel
      .find({
        $or: [
          { username: { $regex: query.trim(), $options: 'i' } },
          { email: { $regex: query.trim(), $options: 'i' } },
        ],
      })
      .select('username email profile statistics')
      .limit(10)
      .exec();

    return { users };
  }

  async getFriends(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .populate('friends', 'username email profile statistics')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { friends: user.friends || [] };
  }

  async getFriendRequests(userId: string) {
    const user = await this.userModel.findById(userId).exec();
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { requests: user.friendRequests || [] };
  }

  async sendFriendRequest(fromId: string, toId: string) {
    // Check if trying to add self
    if (fromId === toId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Check if target user exists
    const toUser = await this.userModel.findById(toId);
    if (!toUser) {
      throw new NotFoundException('User not found');
    }

    // Check if already friends
    const fromUser = await this.userModel.findById(fromId);
    if (fromUser?.friends?.includes(toId)) {
      throw new BadRequestException('Already friends');
    }

    // Check if request already exists
    const existingRequest = toUser.friendRequests?.find(
      (req: any) => req.from?.toString() === fromId,
    );

    if (existingRequest) {
      throw new BadRequestException('Friend request already sent');
    }

    // Add friend request to target user
    if (!toUser.friendRequests) {
      toUser.friendRequests = [];
    }

    toUser.friendRequests.push({
      _id: new Date().getTime().toString(),
      from: fromUser,
      createdAt: new Date(),
    });

    await toUser.save();
    return { message: 'Friend request sent successfully' };
  }

  async acceptFriendRequest(requestId: string) {
    const user = await this.userModel.findOne({
      'friendRequests._id': requestId,
    });

    if (!user) {
      throw new NotFoundException('Friend request not found');
    }

    const request = user.friendRequests.find((req: any) => req._id === requestId);
    
    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    const friendId = request.from._id || request.from;

    // Add to friends list
    if (!user.friends) {
      user.friends = [];
    }
    user.friends.push(friendId);

    // Remove friend request
    user.friendRequests = user.friendRequests.filter(
      (req: any) => req._id !== requestId,
    );

    await user.save();

    // Add current user to friend's friends list
    const friend = await this.userModel.findById(friendId);
    if (friend) {
      if (!friend.friends) {
        friend.friends = [];
      }
      friend.friends.push(user._id.toString());
      await friend.save();
    }

    return { message: 'Friend request accepted' };
  }

  async rejectFriendRequest(requestId: string) {
    const user = await this.userModel.findOne({
      'friendRequests._id': requestId,
    });

    if (!user) {
      throw new NotFoundException('Friend request not found');
    }

    user.friendRequests = user.friendRequests.filter(
      (req: any) => req._id !== requestId,
    );

    await user.save();

    return { message: 'Friend request rejected' };
  }

  // Daily Challenge Streak Methods

  async getTodayDailyChallenge() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dailyChallenge = await this.dailyChallengeModel.findOne({ date: today });

    if (!dailyChallenge) {
      // If no daily challenge exists for today, create one
      // This would typically be done by a cron job, but we'll handle it here as fallback
      throw new NotFoundException('No daily challenge available for today');
    }

    return dailyChallenge;
  }

  async completeDailyChallenge(userId: string, challengeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find today's daily challenge
    const dailyChallenge = await this.dailyChallengeModel.findOne({ date: today });

    if (!dailyChallenge) {
      throw new NotFoundException('No daily challenge available for today');
    }

    // Verify the challenge ID matches
    if (dailyChallenge.challengeId.toString() !== challengeId) {
      throw new BadRequestException('Challenge ID does not match today\'s daily challenge');
    }

    // Check if user already completed today's challenge
    if (dailyChallenge.completedBy.includes(userId as any)) {
      throw new BadRequestException('You have already completed today\'s daily challenge');
    }

    // Get user
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Initialize dailyChallenge object if it doesn't exist
    if (!user.dailyChallenge) {
      user.dailyChallenge = {
        currentStreak: 0,
        longestStreak: 0,
        totalDailyChallengesCompleted: 0,
      };
    }

    // Check if user completed yesterday's challenge
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastCompleted = user.dailyChallenge.lastCompletedDate;
    const lastCompletedDate = lastCompleted ? new Date(lastCompleted) : null;

    if (lastCompletedDate) {
      lastCompletedDate.setHours(0, 0, 0, 0);
    }

    let streakIncreased = false;

    if (!lastCompletedDate) {
      // First time completing a daily challenge
      user.dailyChallenge.currentStreak = 1;
      streakIncreased = true;
    } else if (lastCompletedDate.getTime() === yesterday.getTime()) {
      // Completed yesterday, continue streak
      user.dailyChallenge.currentStreak += 1;
      streakIncreased = true;
    } else if (lastCompletedDate.getTime() === today.getTime()) {
      // Already completed today (shouldn't happen due to earlier check)
      throw new BadRequestException('You have already completed today\'s daily challenge');
    } else {
      // Missed a day, reset streak
      user.dailyChallenge.currentStreak = 1;
    }

    // Update longest streak
    if (user.dailyChallenge.currentStreak > user.dailyChallenge.longestStreak) {
      user.dailyChallenge.longestStreak = user.dailyChallenge.currentStreak;
    }

    // Update last completed date
    user.dailyChallenge.lastCompletedDate = today;
    user.dailyChallenge.totalDailyChallengesCompleted += 1;

    // Award bonus XP
    const bonusXp = dailyChallenge.bonusXp;
    user.statistics.xp += bonusXp;
    user.statistics.totalPoints += bonusXp;

    // Add user to completed list
    dailyChallenge.completedBy.push(userId as any);

    // Save both documents
    await user.save();
    await dailyChallenge.save();

    return {
      message: 'Daily challenge completed successfully',
      streak: user.dailyChallenge.currentStreak,
      longestStreak: user.dailyChallenge.longestStreak,
      bonusXp,
      streakIncreased,
    };
  }

  async getUserDailyChallengeStats(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyChallenge = await this.dailyChallengeModel.findOne({ date: today });
    const completedToday = dailyChallenge?.completedBy.includes(userId as any) || false;

    return {
      currentStreak: user.dailyChallenge?.currentStreak || 0,
      longestStreak: user.dailyChallenge?.longestStreak || 0,
      lastCompletedDate: user.dailyChallenge?.lastCompletedDate,
      totalDailyChallengesCompleted: user.dailyChallenge?.totalDailyChallengesCompleted || 0,
      completedToday,
    };
  }
}
