import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, FriendRequest } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private emailService: EmailService,
  ) { }

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
        successRate: 0,
        totalTimeCoding: 0,
      },
      profile: {},
      achievements: [],
      badges: [],
    });

    await user.save();

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

    return user;
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
}
