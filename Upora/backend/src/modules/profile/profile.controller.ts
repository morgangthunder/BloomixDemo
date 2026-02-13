import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { SuperAdminUsersService } from '../super-admin/super-admin-users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly usersService: SuperAdminUsersService) {}

  @Get('dashboard')
  async getDashboard(@Req() req: Request) {
    const user = (req as any).user;
    const userId = user?.userId || user?.sub;
    if (!userId) {
      return { error: 'Not authenticated' };
    }
    return this.usersService.getUserDashboard(userId, { viewerRole: 'self' }, userId);
  }
}
