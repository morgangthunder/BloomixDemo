import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

const BACKEND_VERSION = '0.0.4';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      message: 'Upora Backend is running',
      timestamp: new Date().toISOString(),
      version: BACKEND_VERSION,
    };
  }

  @Get('version')
  getVersion() {
    return {
      version: BACKEND_VERSION,
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  getHello() {
    return this.appService.getHello();
  }
}