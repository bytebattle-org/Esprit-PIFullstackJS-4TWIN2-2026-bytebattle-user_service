import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class AdminSeedService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const isEnabled = (this.configService.get<string>('ADMIN_SEED_ENABLED', 'true') || 'true')
      .toLowerCase() === 'true';

    if (!isEnabled) {
      this.logger.log('Admin seeding is disabled (ADMIN_SEED_ENABLED=false).');
      return;
    }

    const adminEmail = this.configService.get<string>('ADMIN_EMAIL', 'admin@bytebattle.com');
    const adminUsername = this.configService.get<string>('ADMIN_USERNAME', 'admin');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD', 'Admin@12345');
    const syncPassword = (this.configService.get<string>('ADMIN_SEED_SYNC_PASSWORD', 'true') || 'true')
      .toLowerCase() === 'true';

    const configuredAdmin = await this.userModel.findOne({ email: adminEmail });

    if (configuredAdmin) {
      const updates: Partial<UserDocument> = {};

      if (configuredAdmin.role !== 'admin') {
        updates.role = 'admin';
      }

      if (!configuredAdmin.isEmailVerified) {
        updates.isEmailVerified = true;
      }

      if (!configuredAdmin.passwordHash || syncPassword) {
        updates.passwordHash = await bcrypt.hash(adminPassword, 10);
      }

      if (Object.keys(updates).length > 0) {
        await this.userModel.updateOne({ _id: configuredAdmin._id }, { $set: updates });
        this.logger.log(`Admin account synchronized: ${adminEmail}`);
      } else {
        this.logger.log(`Admin account already ready: ${adminEmail}`);
      }

      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    let finalUsername = adminUsername;
    const usernameTaken = await this.userModel.findOne({ username: finalUsername });
    if (usernameTaken) {
      finalUsername = `${adminUsername}_seed`;
    }

    const admin = new this.userModel({
      username: finalUsername,
      email: adminEmail,
      passwordHash,
      role: 'admin',
      provider: 'local',
      isEmailVerified: true,
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

    await admin.save();
    this.logger.log(`Admin account created successfully: ${adminEmail}`);
  }
}
