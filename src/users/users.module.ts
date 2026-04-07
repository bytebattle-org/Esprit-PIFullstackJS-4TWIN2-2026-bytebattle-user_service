import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DailyChallengeService } from './daily-challenge.service';
import { User, UserSchema } from './schemas/user.schema';
import { DailyChallenge, DailyChallengeSchema } from './schemas/daily-challenge.schema';
import { EmailModule } from '../email/email.module';
import { AdminSeedService } from './admin-seed.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: DailyChallenge.name, schema: DailyChallengeSchema },
    ]),
    ScheduleModule.forRoot(),
    EmailModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, DailyChallengeService, AdminSeedService],
  exports: [UsersService],
})
export class UsersModule {}
