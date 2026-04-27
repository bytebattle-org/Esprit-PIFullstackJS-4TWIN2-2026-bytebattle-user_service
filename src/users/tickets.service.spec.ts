import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import { Ticket, TicketDocument } from './schemas/ticket.schema';

describe('TicketsService', () => {
  let service: TicketsService;
  let ticketModel: Model<TicketDocument>;

  const mockTicket = {
    _id: 'ticket123',
    userId: 'user123',
    username: 'testuser',
    userEmail: 'test@example.com',
    subject: 'Test Issue',
    description: 'Test description',
    status: 'open',
    priority: 'medium',
    category: 'technical',
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(this),
    toObject: jest.fn().mockReturnThis(),
  };

  const mockTicketModel = {
    findById: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    // Create a constructor function for the model
    function TicketModelMock(dto: any) {
      return {
        ...dto,
        save: jest.fn().mockResolvedValue({ ...mockTicket, ...dto }),
      };
    }
    Object.assign(TicketModelMock, mockTicketModel);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: getModelToken(Ticket.name),
          useValue: TicketModelMock,
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    ticketModel = module.get<Model<TicketDocument>>(getModelToken(Ticket.name));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new ticket', async () => {
      const createTicketDto = {
        subject: 'Test Issue',
        description: 'Test description',
        category: 'technical' as const,
        priority: 'medium' as const,
      };

      // Mock ObjectId to return a valid string
      const result = await service.create(
        '507f1f77bcf86cd799439011', // Valid 24-char hex string
        'testuser',
        'test@example.com',
        createTicketDto
      );

      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all tickets', async () => {
      const tickets = [mockTicket, { ...mockTicket, _id: 'ticket456' }];
      const sortMock = jest.fn().mockReturnThis();
      const execMock = jest.fn().mockResolvedValue(tickets);

      mockTicketModel.find.mockReturnValue({
        sort: sortMock,
        exec: execMock,
      } as any);

      const result = await service.findAll();

      expect(result).toEqual(tickets);
      expect(sortMock).toHaveBeenCalledWith({ priority: -1, createdAt: -1 });
    });
  });

  describe('findOne', () => {
    it('should return a ticket by id', async () => {
      const execMock = jest.fn().mockResolvedValue(mockTicket);
      mockTicketModel.findById.mockReturnValue({
        exec: execMock,
      } as any);

      const result = await service.findOne('ticket123');

      expect(result).toEqual(mockTicket);
      expect(mockTicketModel.findById).toHaveBeenCalledWith('ticket123');
    });

    it('should throw NotFoundException if ticket not found', async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      mockTicketModel.findById.mockReturnValue({
        exec: execMock,
      } as any);

      await expect(service.findOne('nonexistent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getStatistics', () => {
    it('should return ticket statistics', async () => {
      mockTicketModel.countDocuments
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5)  // open
        .mockResolvedValueOnce(3)  // in-progress
        .mockResolvedValueOnce(2); // closed

      mockTicketModel.aggregate.mockResolvedValue([
        { _id: 'technical', count: 5 },
        { _id: 'billing', count: 3 },
      ]);

      const result = await service.getStatistics();

      expect(result.total).toBe(10);
      expect(result.open).toBe(5);
      expect(result.inProgress).toBe(3);
      expect(result.closed).toBe(2);
    });
  });
});
