import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Headers,
  ParseUUIDPipe,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import type { CreateMessageDto } from './messages.service';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * Create a direct message.
   */
  @Post()
  async createMessage(
    @Body() dto: CreateMessageDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole?: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.messagesService.createMessage(userId, dto, userRole, tenantId);
  }

  /**
   * Get unread message count for the current user.
   */
  @Get('unread-count')
  async getUnreadCount(
    @Headers('x-user-id') userId: string,
  ) {
    return this.messagesService.getUnreadCount(userId);
  }

  /**
   * Get all messages for the current user (sent and received).
   */
  @Get()
  async getMessages(
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole?: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    return this.messagesService.getMessages(userId, userRole, tenantId);
  }

  /**
   * Mark a message as read.
   */
  @Patch(':id/read')
  async markAsRead(
    @Param('id', ParseUUIDPipe) messageId: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-user-role') userRole?: string,
  ) {
    return this.messagesService.markAsRead(messageId, userId, userRole);
  }
}
