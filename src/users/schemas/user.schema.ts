import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: false })
  passwordHash: string;

  @Prop({ enum: ['user', 'admin'], default: 'user' })
  role: string;

  @Prop({ enum: ['local', 'google', 'github'], default: 'local' })
  provider: string;

  @Prop()
  providerId: string;

  @Prop()
  providerAvatar: string;

  @Prop({
    type: {
      avatar: String,
      bio: String,
      preferredLanguages: [String],
    },
    default: {},
  })
  profile: {
    avatar?: string;
    bio?: string;
    preferredLanguages?: string[];
  };

  @Prop({
    type: {
      totalPoints: { type: Number, default: 0 },
      level: { type: Number, default: 1 },
      currentStreak: { type: Number, default: 0 },
      xp: { type: Number, default: 0 },
      challengesCompleted: { type: Number, default: 0 },
      successRate: { type: Number, default: 0 },
      totalTimeCoding: { type: Number, default: 0 },
    },
    default: {},
  })
  statistics: {
    totalPoints: number;
    level: number;
    currentStreak: number;
    xp: number;
    challengesCompleted: number;
    successRate: number;
    totalTimeCoding: number;
  };

  @Prop({
    type: [
      {
        id: String,
        name: String,
        unlockedAt: Date,
        rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary'] },
      },
    ],
    default: [],
  })
  achievements: Array<{
    id: string;
    name: string;
    unlockedAt: Date;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
  }>;

  @Prop({ type: [String], default: [] })
  badges: string[];

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ required: false })
  verificationCode?: string;

  @Prop({ required: false })
  verificationCodeExpires?: Date;

  @Prop({ required: false })
  passwordResetToken?: string;

  @Prop({ required: false })
  passwordResetExpires?: Date;

  @Prop({ required: false })
  refreshToken?: string;

  // WebAuthn credentials for Face ID / Touch ID / Fingerprint
  @Prop({
    type: [
      {
        credentialId: String,
        credentialPublicKey: String,
        counter: Number,
        transports: [String],
        createdAt: Date,
      },
    ],
    default: [],
  })
  webauthnCredentials: Array<{
    credentialId: string;
    credentialPublicKey: string;
    counter: number;
    transports?: string[];
    createdAt: Date;
  }>;

  @Prop({ required: false })
  currentChallenge?: string;

  // Two-Factor Authentication (TOTP)
  @Prop({ required: false })
  twoFactorSecret?: string;

  @Prop({ default: false })
  isTwoFactorEnabled: boolean;

  @Prop({ type: [String], default: [] })
  twoFactorRecoveryCodes: string[];

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Create indexes
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ 'statistics.totalPoints': -1 });
UserSchema.index({ 'statistics.level': -1 });
UserSchema.index({ createdAt: -1 });
