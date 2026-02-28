import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Headers,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { hasRequiredTier } from '../../common/utils/subscription-tiers';

@Controller('courses')
export class CoursesController {
  constructor(private readonly service: CoursesService) {}

  @Get('approved')
  async getApprovedCourses() {
    return this.service.getApprovedCourses();
  }

  @Get()
  async getCourses(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole?: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.service.getCourses(userId, userRole, tenantId);
  }

  @Get(':id')
  async getCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId?: string,
    @Headers('x-user-role') userRole?: string,
    @Headers('x-subscription-tier') subscriptionTier?: string,
  ) {
    const course = await this.service.getCourse(id, userId, userRole);
    if (!course) return course;

    const accessLevel = (course as any).accessLevel || 'public';
    const requiredTier = (course as any).requiredSubscriptionTier || null;

    if (accessLevel === 'paid') {
      return { ...course, accessDenied: true, reason: 'paid', message: 'This course requires a purchase (coming soon).' };
    }
    if (accessLevel === 'login_required') {
      if (!userId) {
        return { ...course, accessDenied: true, reason: 'login_required', requiredTier };
      }
      if (requiredTier && !hasRequiredTier(subscriptionTier || null, requiredTier)) {
        return { ...course, accessDenied: true, reason: 'tier_required', requiredTier };
      }
    }

    return course;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCourse(
    @Headers('x-user-id') userId: string,
    @Body() body: { title: string; description?: string },
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    const tid = tenantId || '00000000-0000-0000-0000-000000000001';
    return this.service.createCourse(userId, tid, body);
  }

  @Patch(':id')
  async updateCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { title?: string; description?: string; status?: string; accessLevel?: string; requiredSubscriptionTier?: string | null },
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.updateCourse(id, userId, body, userRole);
  }

  @Patch(':id/lesson-order')
  @HttpCode(HttpStatus.OK)
  async reorderLessons(
    @Param('id', ParseUUIDPipe) courseId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { lessonIds: string[] },
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.reorderLessons(courseId, body.lessonIds, userId, userRole);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.deleteCourse(id, userId, userRole);
  }

  // ════════════════════════════════════════
  // Lesson management within a course
  // ════════════════════════════════════════

  @Get(':id/lessons')
  async getCourseLessons(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getCourseLessons(id);
  }

  @Post(':id/lessons')
  @HttpCode(HttpStatus.OK)
  async addLesson(
    @Param('id', ParseUUIDPipe) courseId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { lessonId: string; addMembersToGroups?: boolean },
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.addLesson(courseId, body.lessonId, userId, userRole);
  }

  @Delete(':id/lessons/:lessonId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeLesson(
    @Param('id', ParseUUIDPipe) courseId: string,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.removeLesson(courseId, lessonId, userId, userRole);
  }
}
