import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { DailyChallengeService } from './daily-challenge.service';
import { User, UserSchema } from './schemas/user.schema';
import { Ticket, TicketSchema } from './schemas/ticket.schema';
import { DailyChallenge, DailyChallengeSchema } from './schemas/daily-challenge.schema';
import { EmailModule } from '../email/email.module';
import { AdminSeedService } from './admin-seed.service';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Ticket.name, schema: TicketSchema },
      { name: DailyChallenge.name, schema: DailyChallengeSchema },
    ]),
    ScheduleModule.forRoot(),
    EmailModule,
    RabbitMQModule,
  ],
  controllers: [UsersController, TicketsController],
  providers: [UsersService, TicketsService, DailyChallengeService, AdminSeedService],
  exports: [UsersService, TicketsService],
})
export class UsersModule {}
