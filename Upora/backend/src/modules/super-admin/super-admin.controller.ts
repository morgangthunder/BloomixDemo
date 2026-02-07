import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { UserPersonalizationService } from '../user-personalization/user-personalization.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super-admin')
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly userPersonalizationService: UserPersonalizationService,
  ) {}

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

  @Get('onboarding/popular-selections')
  async getOnboardingPopularSelections() {
    return this.userPersonalizationService.getPopularSelections();
  }

  @Get('onboarding/options')
  async getOnboardingOptions() {
    return this.userPersonalizationService.getAllOptions();
  }

  @Patch('onboarding/options/:category')
  async updateOnboardingOptions(
    @Param('category') category: string,
    @Body('options') options: { id: string; label: string }[],
  ) {
    return this.userPersonalizationService.updateOptions(category, options);
  }
}

