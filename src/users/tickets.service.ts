import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Ticket, TicketDocument, TicketStatus } from './schemas/ticket.schema';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto, AddTicketMessageDto } from './dto/update-ticket.dto';

@Injectable()
export class TicketsService {
  constructor(
    @InjectModel(Ticket.name) private ticketModel: Model<TicketDocument>,
  ) {}

  async create(userId: string, username: string, userEmail: string, createTicketDto: CreateTicketDto): Promise<Ticket> {
    const ticket = new this.ticketModel({
      ...createTicketDto,
      userId: new Types.ObjectId(userId),
      username,
      userEmail,
      status: TicketStatus.OPEN,
    });

    return ticket.save();
  }

  async findAll(filters?: {
    status?: TicketStatus;
    category?: string;
    userId?: string;
  }): Promise<Ticket[]> {
    const query: any = {};

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.category) {
      query.category = filters.category;
    }

    if (filters?.userId) {
      query.userId = new Types.ObjectId(filters.userId);
    }

    console.log('🔍 TicketsService.findAll - Query:', JSON.stringify(query));
    console.log('🔍 TicketsService.findAll - Filters:', JSON.stringify(filters));

    const tickets = await this.ticketModel
      .find(query)
      .sort({ priority: -1, createdAt: -1 })
      .exec();

    console.log('🔍 TicketsService.findAll - Found tickets:', tickets.length);
    console.log('🔍 TicketsService.findAll - Tickets:', JSON.stringify(tickets, null, 2));

    return tickets;
  }

  async findOne(id: string): Promise<Ticket> {
    const ticket = await this.ticketModel.findById(id).exec();
    
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async findUserTickets(userId: string): Promise<Ticket[]> {
    return this.ticketModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async update(id: string, updateTicketDto: UpdateTicketDto, adminId?: string, adminUsername?: string): Promise<Ticket> {
    const ticket = await this.ticketModel.findById(id);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (updateTicketDto.status) {
      ticket.status = updateTicketDto.status;

      if (updateTicketDto.status === TicketStatus.CLOSED && adminId) {
        ticket.resolvedAt = new Date();
        ticket.resolvedBy = new Types.ObjectId(adminId);
      }
    }

    if (updateTicketDto.priority) {
      ticket.priority = updateTicketDto.priority;
    }

    if (updateTicketDto.assignedTo) {
      ticket.assignedTo = new Types.ObjectId(updateTicketDto.assignedTo);
      ticket.assignedToUsername = adminUsername;
    }

    return ticket.save();
  }

  async addMessage(
    ticketId: string,
    userId: string,
    username: string,
    isAdmin: boolean,
    addMessageDto: AddTicketMessageDto,
  ): Promise<Ticket> {
    const ticket = await this.ticketModel.findById(ticketId);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Check if user owns the ticket or is admin
    if (!isAdmin && ticket.userId.toString() !== userId) {
      throw new ForbiddenException('You can only add messages to your own tickets');
    }

    ticket.messages.push({
      message: addMessageDto.message,
      userId: new Types.ObjectId(userId),
      username,
      isAdmin,
      createdAt: new Date(),
    } as any);

    // If ticket was closed and user adds a message, reopen it
    if (ticket.status === TicketStatus.CLOSED && !isAdmin) {
      ticket.status = TicketStatus.OPEN;
    }

    return ticket.save();
  }

  async delete(id: string): Promise<void> {
    const result = await this.ticketModel.findByIdAndDelete(id).exec();
    
    if (!result) {
      throw new NotFoundException('Ticket not found');
    }
  }

  async getStatistics(): Promise<any> {
    console.log('📊 TicketsService.getStatistics - Called');
    const total = await this.ticketModel.countDocuments();
    console.log('📊 Total count:', total);
    const open = await this.ticketModel.countDocuments({ status: TicketStatus.OPEN });
    console.log('📊 Open count:', open);
    const inProgress = await this.ticketModel.countDocuments({ status: TicketStatus.IN_PROGRESS });
    console.log('📊 In Progress count:', inProgress);
    const closed = await this.ticketModel.countDocuments({ status: TicketStatus.CLOSED });
    console.log('📊 Closed count:', closed);

    const byCategory = await this.ticketModel.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      total,
      open,
      inProgress,
      closed,
      byCategory,
    };
  }
}
