import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatGateway } from '../../gateway/chat.gateway';
import { GrokService } from '../../services/grok.service';
import { TokenTrackingService } from '../../services/token-tracking.service';
import { AiAssistantModule } from '../ai-assistant/ai-assistant.module';
import { Lesson } from '../../entities/lesson.entity';
import { LlmProvider } from '../../entities/llm-provider.entity';
import { InteractionType } from '../../entities/interaction-type.entity';
import { ProcessedContentOutput } from '../../entities/processed-content-output.entity';
import { InteractionAIContextService } from '../../services/interaction-ai-context.service';
import { AITeacherPromptBuilderService } from '../../services/ai-teacher-prompt-builder.service';
import { InteractionResponseParserService } from '../../services/interaction-response-parser.service';
import { AiPromptsModule } from '../ai-prompts/ai-prompts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lesson, LlmProvider, InteractionType, ProcessedContentOutput]),
    AiAssistantModule, // For accessing AiAssistantService
    AiPromptsModule, // For accessing AiPromptsService
  ],
  providers: [
    ChatGateway,
    GrokService,
    TokenTrackingService,
    InteractionAIContextService,
    AITeacherPromptBuilderService,
    InteractionResponseParserService,
  ],
  exports: [ChatGateway, GrokService, TokenTrackingService],
})
export class ChatModule {}

