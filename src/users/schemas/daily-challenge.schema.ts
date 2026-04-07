import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DailyChallengeDocument = DailyChallenge & Document;

@Schema({ timestamps: true })
export class DailyChallenge {
  @Prop({ type: Date, required: true, unique: true })
  date: Date;

  @Prop({ type: Types.ObjectId, ref: 'Challenge', required: true })
  challengeId: Types.ObjectId;

  @Prop({ type: Object })
  challengeData: {
    title: string;
    description: string;
    difficulty: string;
    language: string;
  };

  @Prop({ type: Number, default: 50 })
  bonusXp: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  completedBy: Types.ObjectId[];
}

export const DailyChallengeSchema = SchemaFactory.createForClass(DailyChallenge);

// Create index on date for quick lookups
DailyChallengeSchema.index({ date: 1 });
