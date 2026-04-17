import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TicketDocument = Ticket & Document;

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  CLOSED = 'closed',
}

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TicketCategory {
  CHALLENGE_BUG = 'challenge_bug',
  TEST_CASE_ERROR = 'test_case_error',
  CODE_EXECUTION = 'code_execution',
  BATTLE_ISSUE = 'battle_issue',
  ACCOUNT_ISSUE = 'account_issue',
  FEATURE_REQUEST = 'feature_request',
  OTHER = 'other',
}

@Schema()
export class TicketMessage {
  @Prop({ required: true })
  message: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  username: string;

  @Prop({ default: false })
  isAdmin: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const TicketMessageSchema = SchemaFactory.createForClass(TicketMessage);

@Schema({ timestamps: true })
export class Ticket {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: String, enum: TicketStatus, default: TicketStatus.OPEN })
  status: TicketStatus;

  @Prop({ type: String, enum: TicketPriority, default: TicketPriority.MEDIUM })
  priority: TicketPriority;

  @Prop({ type: String, enum: TicketCategory, required: true })
  category: TicketCategory;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  username: string;

  @Prop()
  userEmail: string;

  @Prop({ type: Types.ObjectId, ref: 'Challenge' })
  challengeId?: Types.ObjectId;

  @Prop()
  challengeTitle?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId;

  @Prop()
  assignedToUsername?: string;

  @Prop({ type: [TicketMessageSchema], default: [] })
  messages: TicketMessage[];

  @Prop()
  resolvedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  resolvedBy?: Types.ObjectId;

  @Prop()
  tags?: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);

// Indexes for better query performance
TicketSchema.index({ userId: 1, status: 1 });
TicketSchema.index({ status: 1, priority: -1, createdAt: -1 });
TicketSchema.index({ category: 1, status: 1 });
