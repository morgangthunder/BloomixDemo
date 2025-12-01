import { Controller, Post, Get, Body, Headers, Param, Query } from '@nestjs/common';
import { InteractionDataService } from '../../services/interaction-data.service';
import type { SaveInstanceDataDto, GetInstanceDataHistoryDto, SaveUserProgressDto } from '../../services/interaction-data.service';

@Controller('interaction-data')
export class InteractionDataController {
  constructor(private readonly dataService: InteractionDataService) {}

  /**
   * Save instance data (anonymous, all students)
   */
  @Post('instance')
  async saveInstanceData(
    @Body() dto: SaveInstanceDataDto,
    @Headers('x-user-id') userId: string,
  ) {
    await this.dataService.saveInstanceData(dto);
    return { saved: true };
  }

  /**
   * Get instance data history (interaction builders and super-admins only)
   */
  @Get('instance/history')
  async getInstanceDataHistory(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole: string,
    @Query('interactionTypeId') interactionTypeId: string,
    @Query('lessonId') lessonId: string,
    @Query('substageId') substageId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: string,
  ) {
    const dto: GetInstanceDataHistoryDto = {
      interactionTypeId,
      lessonId,
      substageId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };

    const data = await this.dataService.getInstanceDataHistory(dto, userId, userRole);
    return { data };
  }

  /**
   * Save or update user progress
   */
  @Post('user-progress')
  async saveUserProgress(
    @Body() dto: SaveUserProgressDto,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    const progress = await this.dataService.saveUserProgress(userId, tenantId, dto);
    return { saved: true, progress };
  }

  /**
   * Get user progress for current interaction
   */
  @Get('user-progress/:lessonId/:stageId/:substageId/:interactionTypeId')
  async getUserProgress(
    @Param('lessonId') lessonId: string,
    @Param('stageId') stageId: string,
    @Param('substageId') substageId: string,
    @Param('interactionTypeId') interactionTypeId: string,
    @Headers('x-user-id') userId: string,
  ) {
    const progress = await this.dataService.getUserProgress(
      userId,
      lessonId,
      stageId,
      substageId,
      interactionTypeId,
    );
    return { progress };
  }

  /**
   * Mark interaction as completed
   */
  @Post('user-progress/complete')
  async markCompleted(
    @Body() body: { lessonId: string; stageId: string; substageId: string; interactionTypeId: string },
    @Headers('x-user-id') userId: string,
  ) {
    const progress = await this.dataService.markCompleted(
      userId,
      body.lessonId,
      body.stageId,
      body.substageId,
      body.interactionTypeId,
    );
    return { completed: true, progress };
  }

  /**
   * Increment attempts
   */
  @Post('user-progress/increment-attempts')
  async incrementAttempts(
    @Body() body: { lessonId: string; stageId: string; substageId: string; interactionTypeId: string },
    @Headers('x-user-id') userId: string,
  ) {
    const progress = await this.dataService.incrementAttempts(
      userId,
      body.lessonId,
      body.stageId,
      body.substageId,
      body.interactionTypeId,
    );
    return { incremented: true, progress };
  }

  /**
   * Get user's public profile
   */
  @Get('user-profile/:userId')
  async getUserPublicProfile(@Param('userId') userId: string) {
    const profile = await this.dataService.getUserPublicProfile(userId);
    return { profile };
  }
}

