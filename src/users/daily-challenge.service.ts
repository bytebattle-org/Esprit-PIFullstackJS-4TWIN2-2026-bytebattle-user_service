import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DailyChallenge, DailyChallengeDocument } from './schemas/daily-challenge.schema';
import axios from 'axios';

@Injectable()
export class DailyChallengeService {
  private readonly logger = new Logger(DailyChallengeService.name);
  private readonly CHALLENGE_SERVICE_URL =
    process.env.CHALLENGE_SERVICE_URL || 'http://localhost:3002';

  constructor(
    @InjectModel(DailyChallenge.name)
    private dailyChallengeModel: Model<DailyChallengeDocument>,
  ) {}

  // Run every day at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async createDailyChallenge() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if daily challenge already exists for today
      const existing = await this.dailyChallengeModel.findOne({ date: today });
      if (existing) {
        this.logger.log('Daily challenge already exists for today');
        return;
      }

      // Fetch a random challenge from Challenge Service
      const challenge = await this.getRandomChallenge();

      if (!challenge) {
        this.logger.error('No challenges available to create daily challenge');
        return;
      }

      // Create daily challenge
      const dailyChallenge = new this.dailyChallengeModel({
        date: today,
        challengeId: new Types.ObjectId(challenge._id),
        challengeData: {
          title: challenge.title,
          description: challenge.description,
          difficulty: challenge.difficulty,
          language: challenge.language,
        },
        bonusXp: this.calculateBonusXp(challenge.difficulty),
        completedBy: [],
      });

      await dailyChallenge.save();
      this.logger.log(
        `Daily challenge created for ${today.toDateString()}: ${challenge.title}`,
      );
    } catch (error) {
      this.logger.error('Error creating daily challenge:', error);
    }
  }

  private async getRandomChallenge(): Promise<any> {
    try {
      // Fetch challenges from Challenge Service
      const response = await axios.get(
        `${this.CHALLENGE_SERVICE_URL}/challenges?limit=20`,
      );
      const challenges = response.data.challenges || response.data;

      if (challenges.length === 0) {
        return null;
      }

      // Pick a random challenge
      const randomIndex = Math.floor(Math.random() * challenges.length);
      return challenges[randomIndex];
    } catch (error) {
      this.logger.error('Error fetching challenge:', error.message);
      return null;
    }
  }

  private calculateBonusXp(difficulty: string): number {
    const xpMap = {
      easy: 30,
      medium: 50,
      hard: 80,
      expert: 100,
    };
    return xpMap[difficulty?.toLowerCase()] || 50;
  }

  // Manual trigger for testing or initial setup
  async createDailyChallengeManually() {
    return this.createDailyChallenge();
  }
}
