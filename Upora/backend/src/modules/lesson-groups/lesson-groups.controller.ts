import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LessonGroupsService } from './lesson-groups.service';
import { AssignmentType } from '../../entities/assignment.entity';

@Controller()
export class LessonGroupsController {
  constructor(private readonly service: LessonGroupsService) {}

  // ════════════════════════════════════════
  // GROUPS (nested under /lessons/:lessonId)
  // ════════════════════════════════════════

  @Get('lessons/:lessonId/groups')
  async getGroups(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.getGroups(lessonId, userId, userRole);
  }

  @Post('lessons/:lessonId/groups')
  @HttpCode(HttpStatus.CREATED)
  async createGroup(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { name: string; description?: string },
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.createGroup(lessonId, userId, body.name, body.description, userRole);
  }

  @Patch('lesson-groups/:groupId')
  async updateGroup(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { name?: string; description?: string },
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.updateGroup(groupId, userId, body, userRole);
  }

  @Delete('lesson-groups/:groupId')
  @HttpCode(HttpStatus.OK)
  async deleteGroup(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.deleteGroup(groupId, userId, userRole);
  }

  // ════════════════════════════════════════
  // GROUP MEMBERS
  // ════════════════════════════════════════

  @Get('lesson-groups/:groupId/members')
  async getMembers(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole?: string,
    @Query('q') searchQuery?: string,
  ) {
    return this.service.getMembers(groupId, userId, searchQuery, userRole);
  }

  @Post('lesson-groups/:groupId/members')
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { userId: string },
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.addMember(groupId, body.userId, userId, userRole);
  }

  @Delete('lesson-groups/:groupId/members/:targetUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('targetUserId', ParseUUIDPipe) targetUserId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.removeMember(groupId, targetUserId, userId, userRole);
  }

  // ════════════════════════════════════════
  // ASSIGNMENTS (nested under /lessons/:lessonId)
  // ════════════════════════════════════════

  @Get('lessons/:lessonId/assignments')
  async getAssignments(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole?: string,
    @Query('groupId') groupId?: string,
  ) {
    return this.service.getAssignments(lessonId, userId, groupId, userRole);
  }

  @Post('lessons/:lessonId/assignments')
  @HttpCode(HttpStatus.CREATED)
  async createAssignment(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: {
      title: string;
      description?: string;
      type?: AssignmentType;
      groupId?: string;
      allowedFileTypes?: string;
      maxFileSizeBytes?: number;
      maxScore?: number;
      stageId?: string;
      substageId?: string;
      sortOrder?: number;
      isPublished?: boolean;
    },
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.createAssignment(lessonId, userId, body, userRole);
  }

  @Patch('assignments/:id')
  async updateAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Body() body: any,
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.updateAssignment(id, userId, body, userRole);
  }

  @Delete('assignments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.deleteAssignment(id, userId, userRole);
  }

  // ════════════════════════════════════════
  // SUBMISSIONS
  // ════════════════════════════════════════

  @Get('assignments/:id/submissions')
  async getSubmissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.getSubmissions(id, userId, userRole);
  }

  @Post('assignments/:id/submit')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  }))
  @HttpCode(HttpStatus.OK)
  async submitAssignment(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @UploadedFile() file: any,
    @Body('comment') comment?: string,
  ) {
    return this.service.submitAssignment(id, userId, {
      comment,
      file: file ? { buffer: file.buffer, originalname: file.originalname, mimetype: file.mimetype, size: file.size } : undefined,
    });
  }

  @Patch('assignment-submissions/:id/grade')
  async gradeSubmission(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { score: number; feedback?: string },
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.gradeSubmission(id, userId, body, userRole);
  }

  @Patch('assignment-submissions/:id/resubmit-request')
  async requestResubmission(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { feedback?: string },
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.requestResubmission(id, userId, body.feedback, userRole);
  }

  // ════════════════════════════════════════
  // STUDENT "MY" ENDPOINTS
  // ════════════════════════════════════════

  @Get('my/assignments')
  async getMyAssignments(
    @Headers('x-user-id') userId: string,
  ) {
    return this.service.getMyAssignments(userId);
  }

  @Get('my/deadlines')
  async getMyDeadlines(
    @Headers('x-user-id') userId: string,
  ) {
    return this.service.getMyDeadlines(userId);
  }

  // ════════════════════════════════════════
  // DEADLINES
  // ════════════════════════════════════════

  @Get('lessons/:lessonId/deadlines')
  async getDeadlines(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.getDeadlines(lessonId, userId, userRole);
  }

  @Post('lessons/:lessonId/deadlines')
  @HttpCode(HttpStatus.CREATED)
  async setDeadline(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { targetUserId: string; deadlineAt: string; groupId?: string; courseId?: string; note?: string },
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.setDeadline(
      lessonId,
      body.targetUserId,
      new Date(body.deadlineAt),
      userId,
      { groupId: body.groupId, courseId: body.courseId, note: body.note },
      userRole,
    );
  }

  @Post('lessons/:lessonId/deadlines/bulk')
  @HttpCode(HttpStatus.CREATED)
  async setBulkDeadline(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { groupId: string; deadlineAt: string; note?: string },
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.setBulkDeadline(lessonId, body.groupId, new Date(body.deadlineAt), userId, body.note, userRole);
  }

  @Patch('deadlines/:id')
  async updateDeadline(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { deadlineAt?: string; note?: string },
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.updateDeadline(
      id,
      userId,
      { deadlineAt: body.deadlineAt ? new Date(body.deadlineAt) : undefined, note: body.note },
      userRole,
    );
  }

  @Delete('deadlines/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDeadline(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.deleteDeadline(id, userId, userRole);
  }

  // ════════════════════════════════════════
  // GROUP PROGRESS
  // ════════════════════════════════════════

  @Get('lesson-groups/:groupId/progress')
  async getGroupProgress(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.getGroupProgressByGroupId(groupId, userId, userRole);
  }

  // ════════════════════════════════════════
  // COURSE GROUPS
  // ════════════════════════════════════════

  @Get('courses/:courseId/groups')
  async getCourseGroups(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.getCourseGroups(courseId, userId, userRole);
  }

  @Post('courses/:courseId/groups')
  @HttpCode(HttpStatus.CREATED)
  async createCourseGroup(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { name: string; description?: string },
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.createCourseGroup(courseId, userId, body.name, body.description, userRole);
  }

  @Get('course-groups/:groupId/lesson-visibility')
  async getCourseGroupLessonVisibility(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.getCourseGroupLessonVisibility(groupId, userId, userRole);
  }

  @Patch('course-groups/:groupId/lesson-visibility')
  async updateCourseGroupLessonVisibility(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { updates: { lessonId: string; isVisible: boolean }[] },
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.updateCourseGroupLessonVisibility(groupId, userId, body.updates, userRole);
  }

  @Get('courses/:courseId/deadlines')
  async getCourseGroupDeadlines(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.getCourseGroupDeadlines(courseId, userId, userRole);
  }

  // ════════════════════════════════════════
  // INVITE MEMBERS
  // ════════════════════════════════════════

  @Post('lesson-groups/:groupId/invite')
  @HttpCode(HttpStatus.OK)
  async inviteMembers(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Headers('x-user-id') userId: string,
    @Body() body: { emails: string[] },
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.service.inviteMembers(groupId, body.emails, userId, userRole);
  }

  @Post('lesson-groups/:groupId/accept-invite')
  @HttpCode(HttpStatus.OK)
  async acceptInvite(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.service.acceptInvite(groupId, userId);
  }

  // ════════════════════════════════════════
  // STUDENT "MY GROUPS" ENDPOINTS
  // ════════════════════════════════════════

  @Get('my/groups')
  async getMyGroups(@Headers('x-user-id') userId: string) {
    return this.service.getMyGroups(userId);
  }

  @Get('lessons/:lessonId/my-groups')
  async getMyLessonGroups(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.service.getMyLessonGroups(lessonId, userId);
  }

  @Get('courses/:courseId/my-groups')
  async getMyCourseGroups(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.service.getMyCourseGroups(courseId, userId);
  }

  @Get('groups/:groupId/detail')
  async getGroupDetail(
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.service.getGroupDetail(groupId, userId);
  }
}
