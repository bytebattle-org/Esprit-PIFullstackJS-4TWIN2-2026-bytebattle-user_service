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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  // ── Public routes (no auth required) ──────────────────────────────────────

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

  @Get('leaderboard')
  getLeaderboard(@Query('limit') limit?: string) {
    return this.usersService.getLeaderboard(limit ? parseInt(limit) : 10);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  searchUsers(@Query('q') query: string) {
    return this.usersService.searchUsers(query);
  }

  @Get('friends')
  @UseGuards(JwtAuthGuard)
  getFriends(@Query('userId') userId: string) {
    return this.usersService.getFriends(userId);
  }

  @Get('friend-requests')
  @UseGuards(JwtAuthGuard)
  getFriendRequests(@Query('userId') userId: string) {
    return this.usersService.getFriendRequests(userId);
  }

  @Post('friend-request')
  @UseGuards(JwtAuthGuard)
  sendFriendRequest(@Body() body: { fromUserId: string; toUserId: string }) {
    return this.usersService.sendFriendRequest(body.fromUserId, body.toUserId);
  }

  @Post('friend-request/:id/accept')
  @UseGuards(JwtAuthGuard)
  acceptFriendRequest(@Param('id') requestId: string, @Body() body: { userId?: string }) {
    // For now, we'll use the simpler version that doesn't require userId
    // The service will find the user by looking up who has this request
    return this.usersService.acceptFriendRequest(requestId);
  }

  @Post('friend-request/:id/reject')
  @UseGuards(JwtAuthGuard)
  rejectFriendRequest(@Param('id') requestId: string, @Body() body: { userId?: string }) {
    // For now, we'll use the simpler version that doesn't require userId
    return this.usersService.rejectFriendRequest(requestId);
  }

  // ── Admin-only routes ──────────────────────────────────────────────────────

  @Get('admin/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  getAnalytics() {
    return this.usersService.getAdminAnalytics();
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateRole(
    @Param('id') id: string,
    @Body('role') role: string,
  ) {
    return this.usersService.updateRole(id, role);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateStatus(
    @Param('id') id: string,
    @Body('isBanned') isBanned: boolean,
  ) {
    return this.usersService.updateStatus(id, isBanned);
  }

  @Post(':id/reset-password-admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  resetPasswordAdmin(
    @Param('id') id: string,
    @Body('newPassword') newPassword?: string,
  ) {
    return this.usersService.resetPasswordAdmin(id, newPassword);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  // ── Authenticated user routes ──────────────────────────────────────────────

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/stats')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  addBadge(@Param('id') id: string, @Body('badge') badge: string) {
    return this.usersService.addBadge(id, badge);
  }
}
