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
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Look up user by email and return their id + role.
   * Used by frontend to resolve the user's actual DB role after Cognito auth.
   */
  @Post('resolve-by-email')
  async resolveByEmail(@Body() body: { email: string }) {
    return this._lookupByEmail(body.email);
  }

  /** Alias for backwards compatibility */
  @Post('mock-login')
  async mockLogin(@Body() body: { email: string }) {
    return this._lookupByEmail(body.email);
  }

  private async _lookupByEmail(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { error: 'User not found', userId: null, role: null };
    }
    return {
      userId: user.id,
      email: user.email,
      name: user.username,
      role: user.role,
      tenantId: user.tenantId,
      subscriptionTier: (user as any).subscription || (user as any).subscriptionTier || 'free',
    };
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(@Headers('x-tenant-id') tenantId?: string) {
    return this.usersService.findAll(tenantId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.usersService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.usersService.update(id, updateUserDto, tenantId);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.usersService.remove(id, tenantId);
  }

  @Post(':id/tokens')
  incrementTokens(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('tokensUsed') tokensUsed: number,
  ) {
    return this.usersService.incrementTokenUsage(id, tokensUsed);
  }

  @Get(':id/token-usage')
  async getTokenUsage(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.usersService.getTokenUsage(id, tenantId);
  }
}
