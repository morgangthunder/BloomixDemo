import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';

// TODO: Add SuperAdminGuard to protect this route
// For now, it's open for testing

@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('token-usage')
  async getTokenUsage() {
    return this.superAdminService.getTokenUsageDashboard();
  }

  @Get('llm-queries')
  async getRecentLlmQueries(
    @Query('assistant') assistant?: string,
    @Query('limit') limit?: string,
  ) {
    return this.superAdminService.getRecentLlmQueries(assistant, limit ? parseInt(limit, 10) : 5);
  }

  @Patch('llm-queries/:id/pin')
  async setLlmQueryPinned(
    @Param('id') id: string,
    @Body('isPinned') isPinned: boolean,
  ) {
    return this.superAdminService.setLlmQueryPinned(id, !!isPinned);
  }
}

