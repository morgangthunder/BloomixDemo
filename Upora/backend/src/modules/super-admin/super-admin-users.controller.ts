import { Controller, Get, Post, Param, Query, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { SuperAdminUsersService } from './super-admin-users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('super-admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super-admin')
export class SuperAdminUsersController {
  constructor(private readonly usersService: SuperAdminUsersService) {}

  @Get('search')
  async search(
    @Query('q') q: string,
    @Query('by') by?: 'email' | 'id' | 'name',
  ) {
    return this.usersService.searchUsers(q || '', by || 'email');
  }

  @Get(':id/dashboard')
  async getDashboard(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const requestingUserId = user?.userId || user?.sub;
    return this.usersService.getUserDashboard(id, { viewerRole: 'super-admin' }, requestingUserId || id);
  }

  @Get(':id/transcriptions')
  async getTranscriptions(@Param('id') id: string) {
    return this.usersService.getTranscriptions(id);
  }

  @Post(':id/send-password-reset')
  async sendPasswordReset(@Param('id') id: string) {
    return this.usersService.sendPasswordReset(id);
  }
}
