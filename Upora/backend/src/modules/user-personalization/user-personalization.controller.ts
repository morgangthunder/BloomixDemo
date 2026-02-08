import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { UserPersonalizationService } from './user-personalization.service';
import { UpdateUserPersonalizationDto } from './dto/update-user-personalization.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('user-personalization')
export class UserPersonalizationController {
  constructor(private readonly service: UserPersonalizationService) {}

  /**
   * Get current user's personalization preferences.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMine(
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-user-email') email?: string,
  ) {
    return this.service.getMine(userId || '', { tenantId, email });
  }

  /**
   * Update current user's personalization preferences.
   */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMine(
    @Headers('x-user-id') userId: string,
    @Body() dto: UpdateUserPersonalizationDto,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-user-email') email?: string,
  ) {
    return this.service.updateMine(userId, dto, { tenantId, email });
  }

  /**
   * Mark onboarding as completed.
   */
  @Patch('me/complete-onboarding')
  @UseGuards(JwtAuthGuard)
  completeOnboarding(
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-user-email') email?: string,
  ) {
    return this.service.completeOnboarding(userId, { tenantId, email });
  }

  /**
   * Mark onboarding as skipped.
   */
  @Patch('me/skip-onboarding')
  @UseGuards(JwtAuthGuard)
  skipOnboarding(
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-user-email') email?: string,
  ) {
    return this.service.skipOnboarding(userId, { tenantId, email });
  }

  /**
   * Get all curated options (all categories).
   * Public - no auth required.
   */
  @Get('options')
  getAllOptions() {
    return this.service.getAllOptions();
  }

  /**
   * Get curated options for a category (tv_movies | hobbies | learning_areas).
   * Optional query params: ageRange, gender - for fallback filtering.
   * Public - no auth required (used by onboarding form).
   */
  @Get('options/:category')
  getOptions(
    @Param('category') category: string,
    @Query('ageRange') ageRange?: string,
    @Query('gender') gender?: string,
  ) {
    return this.service.getOptions(category, ageRange, gender);
  }
}
