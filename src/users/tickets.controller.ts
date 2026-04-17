import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto, AddTicketMessageDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TicketStatus } from './schemas/ticket.schema';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(@Request() req, @Body() createTicketDto: CreateTicketDto) {
    return this.ticketsService.create(
      req.user.userId,
      req.user.username,
      req.user.email,
      createTicketDto,
    );
  }

  @Get()
  findAll(@Query('status') status?: TicketStatus, @Query('category') category?: string, @Request() req?) {
    console.log('🎫 TicketsController.findAll - Called');
    console.log('🎫 Query params - status:', status, 'category:', category);
    console.log('🎫 User from request:', req?.user);
    return this.ticketsService.findAll({ status, category });
  }

  @Get('my-tickets')
  findMyTickets(@Request() req) {
    return this.ticketsService.findUserTickets(req.user.userId);
  }

  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles('admin')
  getStatistics() {
    return this.ticketsService.getStatistics();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(@Param('id') id: string, @Body() updateTicketDto: UpdateTicketDto, @Request() req) {
    return this.ticketsService.update(id, updateTicketDto, req.user.userId, req.user.username);
  }

  @Post(':id/messages')
  addMessage(
    @Param('id') id: string,
    @Request() req,
    @Body() addMessageDto: AddTicketMessageDto,
  ) {
    const isAdmin = req.user.role === 'admin';
    return this.ticketsService.addMessage(
      id,
      req.user.userId,
      req.user.username,
      isAdmin,
      addMessageDto,
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.ticketsService.delete(id);
  }
}
