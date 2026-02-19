import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('verify-email')
  verifyEmail(@Body() body: { email: string; code: string }) {
    return this.usersService.verifyEmail(body.email, body.code);
  }

  @Post('resend-verification')
  resendVerification(@Body() body: { email: string }) {
    return this.usersService.resendVerificationCode(body.email);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('leaderboard')
  getLeaderboard(@Query('limit') limit?: string) {
    return this.usersService.getLeaderboard(limit ? parseInt(limit) : 10);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Patch(':id/stats')
  updateStats(
    @Param('id') id: string,
    @Body()
    stats: {
      totalPoints?: number;
      level?: number;
      currentStreak?: number;
      xp?: number;
      challengesCompleted?: number;
      successRate?: number;
      totalTimeCoding?: number;
    },
  ) {
    return this.usersService.updateStats(id, stats);
  }

  @Post(':id/achievements')
  addAchievement(
    @Param('id') id: string,
    @Body()
    achievement: {
      id: string;
      name: string;
      rarity: 'common' | 'rare' | 'epic' | 'legendary';
    },
  ) {
    return this.usersService.addAchievement(id, achievement);
  }

  @Post(':id/badges')
  addBadge(@Param('id') id: string, @Body('badge') badge: string) {
    return this.usersService.addBadge(id, badge);
  }
}
