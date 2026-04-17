import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  health() {
    return {
      status: 'UP',
      timestamp: new Date(),
    };
  }

  @Get('info')
  info() {
    return {
      name: 'USER-SERVICE',
      version: '1.0.0',
      status: 'running',
    };
  }
}
