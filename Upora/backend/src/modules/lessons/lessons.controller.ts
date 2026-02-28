import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Headers,
  ParseUUIDPipe,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { LessonLoaderService } from './lesson-loader.service';
import { SuperAdminUsersService } from '../super-admin/super-admin-users.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { hasRequiredTier } from '../../common/utils/subscription-tiers';

@Controller('lessons')
export class LessonsController {
  constructor(
    private readonly lessonsService: LessonsService,
    private readonly lessonLoaderService: LessonLoaderService,
    private readonly superAdminUsersService: SuperAdminUsersService,
  ) {}

  @Post()
  create(@Body() createLessonDto: CreateLessonDto) {
    return this.lessonsService.create(createLessonDto);
  }

  @Get()
  findAll(
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-user-id') userId?: string,
    @Query('status') status?: string,
    @Query('approved') approved?: string,
    @Query('createdBy') createdBy?: string,
  ) {
    // Support both ?status=approved and ?approved=true for backwards compatibility
    const onlyApproved = status === 'approved' || approved === 'true';
    // Support ?createdBy=me to filter by the requesting user
    const filterCreatedBy = createdBy === 'me' ? userId : createdBy;
    console.log(`[LessonsController] GET /lessons - tenantId: ${tenantId}, status: ${status}, onlyApproved: ${onlyApproved}, createdBy: ${filterCreatedBy}`);
    return this.lessonsService.findAll(tenantId, onlyApproved, filterCreatedBy);
  }

  /**
   * Creator engagement view: get dashboard for one engager (lesson-creator scope).
   * Must be declared before @Get(':id') so /lessons/:lessonId/engagers/:userId/dashboard matches.
   */
  @Get(':lessonId/engagers/:userId/dashboard')
  async getEngagerDashboard(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Headers('x-user-id') requestingUserId: string,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-user-role') userRole?: string,
  ) {
    await this.lessonsService.assertCanViewEngagers(lessonId, requestingUserId, tenantId, userRole);
    return this.superAdminUsersService.getUserDashboard(userId, { viewerRole: 'lesson-creator', lessonId }, requestingUserId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-role') userRole?: string,
    @Headers('x-subscription-tier') subscriptionTier?: string,
  ) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id) && !/^\d+$/.test(id)) {
      throw new BadRequestException('Invalid lesson ID format. Expected UUID or numeric ID.');
    }
    const lesson = await this.lessonsService.findOne(id, tenantId);
    if (!lesson) return lesson;

    const accessLevel = (lesson as any).accessLevel || 'public';
    const requiredTier = (lesson as any).requiredSubscriptionTier || null;

    if (accessLevel === 'paid') {
      return { ...lesson, accessDenied: true, reason: 'paid', message: 'This lesson requires a purchase (coming soon).' };
    }
    if (accessLevel === 'login_required') {
      if (!userId) {
        return { ...lesson, accessDenied: true, reason: 'login_required', requiredTier };
      }
      if (requiredTier && !hasRequiredTier(subscriptionTier || null, requiredTier)) {
        return { ...lesson, accessDenied: true, reason: 'tier_required', requiredTier };
      }
    }

    return lesson;
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLessonDto: UpdateLessonDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-user-role') userRole?: string,
  ) {
    console.log('[LessonsController] PATCH /:id');
    console.log('[LessonsController] Updating lesson:', id, 'by user:', userId, 'role:', userRole);
    console.log('[LessonsController] Payload keys:', Object.keys(updateLessonDto));
    
    return this.lessonsService.update(id, updateLessonDto, userId, tenantId, userRole);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.lessonsService.remove(id, userId, tenantId);
  }

  @Post(':id/submit')
  submitForApproval(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.lessonsService.submitForApproval(id, userId, tenantId);
  }

  @Post(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.lessonsService.approve(id, tenantId);
  }

  @Post(':id/reject')
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.lessonsService.reject(id, tenantId);
  }

  @Post(':id/view')
  trackView(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.lessonsService.trackView(id, userId, tenantId);
  }

  @Post(':id/complete')
  markCompletion(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.lessonsService.markCompletion(id, userId, tenantId);
  }

  // ====================================
  // Lesson Loading from JSON Files
  // ====================================

  @Get('admin/json-files')
  getAvailableLessonFiles() {
    return {
      files: this.lessonLoaderService.getAvailableLessonFiles(),
    };
  }

  @Post('admin/load-from-json/:filename')
  async loadLessonFromFile(@Param('filename') filename: string) {
    const lesson = await this.lessonLoaderService.loadLessonFromFile(filename);
    return {
      message: 'Lesson loaded successfully',
      lesson: {
        id: lesson.id,
        title: lesson.title,
        status: lesson.status,
      },
    };
  }

  @Post('admin/load-all-json')
  async loadAllLessons() {
    const lessons = await this.lessonLoaderService.loadAllLessons();
    return {
      message: `Loaded ${lessons.length} lessons`,
      lessons: lessons.map(l => ({
        id: l.id,
        title: l.title,
        status: l.status,
      })),
    };
  }

  @Post('admin/reload/:id')
  async reloadLesson(@Param('id', ParseUUIDPipe) id: string) {
    const lesson = await this.lessonLoaderService.reloadLesson(id);
    return {
      message: 'Lesson reloaded from JSON',
      lesson: {
        id: lesson.id,
        title: lesson.title,
        status: lesson.status,
      },
    };
  }

  // ====================================
  // Creator Engagement View (Phase 6.5)
  // ====================================

  @Get(':id/engagers')
  async getEngagers(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId?: string,
    @Headers('x-user-role') userRole?: string,
    @Query('q') searchQuery?: string,
  ) {
    console.log('[LessonsController] getEngagers:', { lessonId: id, searchQuery });
    const engagers = await this.lessonsService.getEngagers(id, userId, tenantId, searchQuery, userRole);
    console.log('[LessonsController] Returning', engagers.length, 'engagers');
    return engagers;
  }
}
