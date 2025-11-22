import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatGateway } from '../../gateway/chat.gateway';
import { GrokService } from '../../services/grok.service';
import { TokenTrackingService } from '../../services/token-tracking.service';
import { AiAssistantModule } from '../ai-assistant/ai-assistant.module';
import { Lesson } from '../../entities/lesson.entity';
import { LlmProvider } from '../../entities/llm-provider.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lesson, LlmProvider]),
    AiAssistantModule, // For accessing AiAssistantService
  ],
  providers: [ChatGateway, GrokService, TokenTrackingService],
  exports: [ChatGateway, GrokService, TokenTrackingService],
})
export class ChatModule {}

