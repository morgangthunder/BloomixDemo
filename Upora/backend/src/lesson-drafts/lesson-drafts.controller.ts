import { Controller, Get, Post, Delete, Param, Body, Headers, UsePipes, ValidationPipe } from '@nestjs/common';
import { LessonDraftsService } from './lesson-drafts.service';
import { CreateLessonDraftDto } from './dto/create-lesson-draft.dto';
import { ApproveDraftDto } from './dto/approve-draft.dto';

@Controller('lesson-drafts')
export class LessonDraftsController {
  constructor(private readonly lessonDraftsService: LessonDraftsService) {}

  /**
   * Create or update a draft
   */
  @Post()
  async createOrUpdateDraft(
    @Body() dto: CreateLessonDraftDto,
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-user-id') userId: string,
  ) {
    console.log('[LessonDraftsController] 📥 Received draft creation request');
    console.log('[LessonDraftsController] 📥 DTO:', JSON.stringify(dto, null, 2));
    console.log('[LessonDraftsController] 📥 Tenant ID from header:', tenantId);
    console.log('[LessonDraftsController] 📥 User ID from header:', userId);
    
    dto.tenantId = tenantId;
    dto.accountId = userId;
    
    const draft = await this.lessonDraftsService.createOrUpdateDraft(dto);
    
    return {
      message: 'Draft saved successfully',
      draft: {
        id: draft.id,
        lessonId: draft.lessonId,
        status: draft.status,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt
      }
    };
  }

  /**
   * Get all pending drafts for the tenant
   */
  @Get('pending')
  async getPendingDrafts(
    @Headers('x-tenant-id') tenantId: string,
  ) {
    const drafts = await this.lessonDraftsService.getPendingDrafts(tenantId);
    
    return drafts.map(draft => ({
      id: draft.id,
      lessonId: draft.lessonId,
      lessonTitle: draft.lesson?.title,
      createdBy: draft.accountId,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      changesCount: draft.changesCount,
      changeSummary: draft.changeSummary
    }));
  }

  /**
   * Get draft for a specific lesson
   */
  @Get('lesson/:lessonId')
  async getDraftByLessonId(@Param('lessonId') lessonId: string) {
    const draft = await this.lessonDraftsService.getDraftByLessonId(lessonId);
    
    if (!draft) {
      return null; // Return null so frontend can detect no draft
    }

    return {
      id: draft.id,
      status: draft.status,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      changesCount: draft.changesCount,
      draftData: draft.draftData // Include the actual draft data!
    };
  }

  /**
   * Get diff for a draft
   */
  @Get(':id/diff')
  async getDiff(@Param('id') id: string) {
    return await this.lessonDraftsService.generateDiff(id);
  }

  /**
   * Approve a draft
   */
  @Post(':id/approve')
  async approveDraft(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ) {
    const lesson = await this.lessonDraftsService.approveDraft(id, {
      reviewedBy: userId
    });

    return {
      message: 'Draft approved successfully',
      lesson: {
        id: lesson.id,
        title: lesson.title
      }
    };
  }

  /**
   * Reject a draft
   */
  @Post(':id/reject')
  async rejectDraft(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ) {
    const draft = await this.lessonDraftsService.rejectDraft(id, {
      reviewedBy: userId
    });

    return {
      message: 'Draft rejected',
      draft: {
        id: draft.id,
        status: draft.status
      }
    };
  }

  /**
   * Delete a draft
   */
  @Delete(':id')
  async deleteDraft(@Param('id') id: string) {
    await this.lessonDraftsService.deleteDraft(id);
    
    return {
      message: 'Draft deleted successfully'
    };
  }
}

