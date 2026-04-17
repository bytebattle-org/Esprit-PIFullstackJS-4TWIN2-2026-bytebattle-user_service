import { IsString, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';
import { TicketCategory, TicketPriority } from '../schemas/ticket.schema';

export class CreateTicketDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @IsEnum(TicketCategory)
  category: TicketCategory;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsString()
  challengeId?: string;

  @IsOptional()
  @IsString()
  challengeTitle?: string;
}
