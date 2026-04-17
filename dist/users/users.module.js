"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const schedule_1 = require("@nestjs/schedule");
const users_service_1 = require("./users.service");
const users_controller_1 = require("./users.controller");
const tickets_service_1 = require("./tickets.service");
const tickets_controller_1 = require("./tickets.controller");
const daily_challenge_service_1 = require("./daily-challenge.service");
const user_schema_1 = require("./schemas/user.schema");
const ticket_schema_1 = require("./schemas/ticket.schema");
const daily_challenge_schema_1 = require("./schemas/daily-challenge.schema");
const email_module_1 = require("../email/email.module");
const admin_seed_service_1 = require("./admin-seed.service");
const rabbitmq_module_1 = require("../rabbitmq/rabbitmq.module");
let UsersModule = class UsersModule {
};
exports.UsersModule = UsersModule;
exports.UsersModule = UsersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: ticket_schema_1.Ticket.name, schema: ticket_schema_1.TicketSchema },
                { name: daily_challenge_schema_1.DailyChallenge.name, schema: daily_challenge_schema_1.DailyChallengeSchema },
            ]),
            schedule_1.ScheduleModule.forRoot(),
            email_module_1.EmailModule,
            rabbitmq_module_1.RabbitMQModule,
        ],
        controllers: [users_controller_1.UsersController, tickets_controller_1.TicketsController],
        providers: [users_service_1.UsersService, tickets_service_1.TicketsService, daily_challenge_service_1.DailyChallengeService, admin_seed_service_1.AdminSeedService],
        exports: [users_service_1.UsersService, tickets_service_1.TicketsService],
    })
], UsersModule);
//# sourceMappingURL=users.module.js.map