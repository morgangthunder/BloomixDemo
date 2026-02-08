import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { UserPersonalizationService } from '../user-personalization/user-personalization.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateOnboardingOptionsDto } from './dto/update-onboarding-options.dto';

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
    return this.userPersonalizationService.getAllOptionsForAdmin();
  }

  @Patch('onboarding/options/:category')
  async updateOnboardingOptions(
    @Param('category') category: string,
    @Body() dto: UpdateOnboardingOptionsDto,
  ) {
    const options = Array.isArray(dto.options) ? dto.options : [];
    return this.userPersonalizationService.updateOptions(
      category,
      options,
      dto.ageRange || '',
      dto.gender || '',
    );
  }

  @Delete('onboarding/options/:category')
  async deleteOnboardingOptionsVariant(
    @Param('category') category: string,
    @Query('ageRange') ageRange?: string,
    @Query('gender') gender?: string,
  ) {
    return this.userPersonalizationService.deleteVariant(
      category,
      ageRange || '',
      gender || '',
    );
  }
}

