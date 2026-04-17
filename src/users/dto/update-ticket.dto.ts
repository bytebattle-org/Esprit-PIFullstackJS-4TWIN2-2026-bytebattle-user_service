import { IsString, IsEnum, IsOptional } from 'class-validator';
import { TicketStatus, TicketPriority } from '../schemas/ticket.schema';

export class UpdateTicketDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsString()
  assignedTo?: string;
}

export class AddTicketMessageDto {
  @IsString()
  message: string;
}
