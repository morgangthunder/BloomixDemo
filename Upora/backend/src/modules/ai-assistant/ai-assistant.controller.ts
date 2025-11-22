import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AiAssistantService, AssistantChatRequest } from '../../services/ai-assistant.service';
import { User } from '../../entities/user.entity';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequestDto {
  assistantId: string;
  promptKey: string;
  userMessage: string;
  context?: any;
  conversationHistory?: ChatMessage[];
  userId?: string; // TODO: Get from JWT token when auth is implemented
  tenantId?: string; // TODO: Get from JWT token when auth is implemented
}

@Controller('ai-assistant')
export class AiAssistantController {
  constructor(private aiAssistantService: AiAssistantService) {}

  @Post('chat')
  async chat(@Body() body: ChatRequestDto) {
    try {
      const request: AssistantChatRequest = {
        assistantId: body.assistantId,
        promptKey: body.promptKey,
        userMessage: body.userMessage,
        context: body.context,
        conversationHistory: body.conversationHistory || [],
      };

      // TODO: Get user from JWT token when auth is implemented
      // For now, create a mock user object
      const user: User = {
        id: body.userId || 'default-user',
        tenantId: body.tenantId || 'default-tenant',
      } as User;

      const response = await this.aiAssistantService.chat(request, user);

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to process AI assistant request',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

