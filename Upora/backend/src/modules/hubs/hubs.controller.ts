import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { HubsService } from './hubs.service';
import { HubType } from '../../entities/hub.entity';
import { HubMemberRole } from '../../entities/hub-member.entity';

@Controller()
export class HubsController {
  constructor(private readonly hubsService: HubsService) {}

  // ═══════════════════════════════════
  // HUB CRUD
  // ═══════════════════════════════════

  @Post('hubs')
  createHub(
    @Body() body: {
      name: string;
      slug: string;
      description?: string;
      type: HubType;
      isPublic?: boolean;
      logoUrl?: string;
      bannerUrl?: string;
    },
    @Headers('x-user-id') userId: string,
    @Headers('x-tenant-id') tenantId: string,
  ) {
    return this.hubsService.createHub(body, userId, tenantId || '00000000-0000-0000-0000-000000000001');
  }

  @Get('my/hubs')
  getMyHubs(@Headers('x-user-id') userId: string) {
    return this.hubsService.getMyHubs(userId);
  }

  @Get('hubs/:slug')
  getHub(
    @Param('slug') slug: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.hubsService.getHubBySlug(slug, userId);
  }

  @Patch('hubs/:id')
  updateHub(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: {
      name?: string;
      description?: string;
      isPublic?: boolean;
      logoUrl?: string;
      bannerUrl?: string;
      themeConfig?: Record<string, any>;
    },
    @Headers('x-user-id') userId: string,
  ) {
    return this.hubsService.updateHub(id, body, userId);
  }

  @Delete('hubs/:id')
  archiveHub(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.hubsService.archiveHub(id, userId);
  }

  @Patch('hubs/:id/auth-config')
  updateAuthConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: {
      provider: string;
      oidcIssuerUrl?: string;
      oidcClientId?: string;
      oidcClientSecret?: string;
      emailClaim?: string;
      nameClaim?: string;
      scopes?: string;
    },
    @Headers('x-user-id') userId: string,
  ) {
    return this.hubsService.updateAuthConfig(id, body, userId);
  }

  @Get('hubs/:id/auth-config')
  getAuthConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.hubsService.getAuthConfig(id, userId);
  }

  // ═══════════════════════════════════
  // SHELF CONFIG
  // ═══════════════════════════════════

  @Get('hubs/:id/shelf-config')
  getShelfConfig(@Param('id', ParseUUIDPipe) id: string) {
    return this.hubsService.getShelfConfig(id);
  }

  @Patch('hubs/:id/shelf-config')
  updateShelfConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
    @Headers('x-user-id') userId: string,
  ) {
    return this.hubsService.updateShelfConfig(id, body, userId);
  }

  @Get('hubs/by-slug/:slug/shelves-data')
  getShelvesData(
    @Param('slug') slug: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.hubsService.getResolvedShelvesData(slug, userId);
  }

  @Get('hubs/by-slug/:slug/shelf-config')
  getShelfConfigBySlug(@Param('slug') slug: string) {
    return this.hubsService.getShelfConfigBySlug(slug);
  }

  // ═══════════════════════════════════
  // MEMBERS
  // ═══════════════════════════════════

  @Get('hubs/:id/members')
  getMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
    @Query('q') search?: string,
  ) {
    return this.hubsService.getMembers(id, userId, search);
  }

  @Post('hubs/:id/members/invite')
  inviteMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { emails: string[] },
    @Headers('x-user-id') userId: string,
  ) {
    return this.hubsService.inviteMembers(id, body.emails, userId);
  }

  @Post('hubs/:id/members/accept')
  acceptInvite(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.hubsService.acceptInvite(id, userId);
  }

  @Patch('hubs/:id/members/:userId')
  changeMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() body: { role: HubMemberRole },
    @Headers('x-user-id') userId: string,
  ) {
    return this.hubsService.changeMemberRole(id, targetUserId, body.role, userId);
  }

  @Delete('hubs/:id/members/:userId')
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.hubsService.removeMember(id, targetUserId, userId);
  }

  // ═══════════════════════════════════
  // CONTENT
  // ═══════════════════════════════════

  @Get('hubs/:id/content')
  getHubContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.hubsService.getHubContent(id, userId);
  }

  @Post('hubs/:id/content')
  linkContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { lessonId?: string; courseId?: string },
    @Headers('x-user-id') userId: string,
  ) {
    return this.hubsService.linkContent(id, body, userId);
  }

  @Delete('hubs/:id/content/:linkId')
  unlinkContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.hubsService.unlinkContent(id, linkId, userId);
  }

  // Public-facing hub content (by slug)
  @Get('hubs/:slug/lessons')
  getHubLessons(@Param('slug') slug: string) {
    return this.hubsService.getHubLessons(slug);
  }

  @Get('hubs/:slug/courses')
  getHubCourses(@Param('slug') slug: string) {
    return this.hubsService.getHubCourses(slug);
  }

  // ═══════════════════════════════════
  // PUBLISH TO HUBS
  // ═══════════════════════════════════

  @Post('lessons/:id/publish-to-hubs')
  publishLessonToHubs(
    @Param('id', ParseUUIDPipe) lessonId: string,
    @Body() body: { hubIds: string[] },
    @Headers('x-user-id') userId: string,
  ) {
    return this.hubsService.publishToHubs(body.hubIds, lessonId, null, userId);
  }

  @Post('courses/:id/publish-to-hubs')
  publishCourseToHubs(
    @Param('id', ParseUUIDPipe) courseId: string,
    @Body() body: { hubIds: string[] },
    @Headers('x-user-id') userId: string,
  ) {
    return this.hubsService.publishToHubs(body.hubIds, null, courseId, userId);
  }
}
