import { Controller, Post, Get, Body, Headers, Param, Query, Req, BadRequestException } from '@nestjs/common';
import type { Request } from 'express';
import { InteractionDataService } from '../../services/interaction-data.service';
import type { SaveInstanceDataDto, GetInstanceDataHistoryDto, SaveUserProgressDto } from '../../services/interaction-data.service';
import { SuperAdminUsersService } from '../super-admin/super-admin-users.service';

export interface SaveSessionTranscriptDto {
  lessonId: string;
  transcript: Array<{ timestamp: string; speaker: 'user' | 'assistant' | 'system'; type: string; content: string; metadata?: Record<string, any> }>;
}

@Controller('interaction-data')
export class InteractionDataController {
  constructor(
    private readonly dataService: InteractionDataService,
    private readonly superAdminUsersService: SuperAdminUsersService,
  ) {}

  /** Resolve userId from header or JWT (req.user set by JwtAuthGuard or allowWithHeaders) */
  private resolveUserId(headerUserId: string | undefined, req: Request): string {
    const fromHeader = headerUserId?.trim?.();
    if (fromHeader) return fromHeader;
    const fromJwt = (req as any).user?.userId || (req as any).user?.sub;
    if (fromJwt) return fromJwt;
    throw new BadRequestException('User ID required. Ensure x-user-id header or valid JWT is sent.');
  }

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
    @Headers('x-user-id') headerUserId: string,
    @Req() req: Request,
  ) {
    const userId = this.resolveUserId(headerUserId, req);
    const effectiveTenantId = tenantId?.trim?.() || (req as any).user?.tenantId || '';
    // Full DTO log for debugging score persistence (fihivos773 / true-false)
    console.log('[InteractionData] 💾 saveUserProgress called:', {
      userId,
      tenantId: effectiveTenantId,
      lessonId: dto.lessonId,
      stageId: dto.stageId,
      substageId: dto.substageId,
      interactionTypeId: dto.interactionTypeId,
      score: dto.score,
      completed: dto.completed,
      scoreType: typeof dto.score,
      hasScore: dto.score !== undefined && dto.score !== null,
      scoreValue: dto.score,
      timeTakenSeconds: dto.timeTakenSeconds,
      customDataKeys: dto.customData ? Object.keys(dto.customData) : [],
    });
    const progress = await this.dataService.saveUserProgress(userId, effectiveTenantId, dto);
    console.log('[InteractionData] ✅ saveUserProgress completed:', {
      progressId: progress.id,
      userId: progress.userId,
      score: progress.score,
      completed: progress.completed,
      attempts: progress.attempts,
    });
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
    @Headers('x-tenant-id') tenantId: string,
  ) {
    const progress = await this.dataService.markCompleted(
      userId,
      tenantId,
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
    @Headers('x-tenant-id') tenantId: string,
  ) {
    const progress = await this.dataService.incrementAttempts(
      userId,
      tenantId,
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

  /**
   * Save lesson engagement transcript (chat, script blocks, interaction events from lesson-view).
   * Used for super-admin visibility of user engagement; stored in lesson_engagement_transcriptions.
   */
  @Post('session/:sessionId/transcript')
  async saveSessionTranscript(
    @Param('sessionId') sessionId: string,
    @Body() dto: SaveSessionTranscriptDto,
    @Headers('x-user-id') headerUserId: string,
    @Headers('x-tenant-id') headerTenantId: string,
    @Req() req: Request,
  ) {
    const userId = this.resolveUserId(headerUserId, req);
    const tenantId =
      headerTenantId?.trim?.() ||
      (req as any).user?.tenantId ||
      process.env.TENANT_ID ||
      '00000000-0000-0000-0000-000000000001';
    try {
      const transcript = await this.superAdminUsersService.saveEngagementTranscript(
        sessionId,
        userId,
        dto.lessonId,
        tenantId,
        dto.transcript ?? [],
      );
      return { saved: true, id: transcript.id };
    } catch (err: any) {
      console.error('[InteractionData] saveSessionTranscript failed:', err?.message || err);
      throw err;
    }
  }
}

