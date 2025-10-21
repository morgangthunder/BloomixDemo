import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      message: 'Upora Backend is running',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  @Get()
  getHello() {
    return this.appService.getHello();
  }
}