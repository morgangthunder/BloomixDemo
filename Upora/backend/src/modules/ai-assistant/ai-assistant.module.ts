import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from '../../services/ai-assistant.service';
import { GrokService } from '../../services/grok.service';
import { AiPromptsModule } from '../ai-prompts/ai-prompts.module';
import { LlmGenerationLog } from '../../entities/llm-generation-log.entity';
import { LlmProvider } from '../../entities/llm-provider.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LlmGenerationLog, LlmProvider]),
    AiPromptsModule, // For accessing AiPromptsService
  ],
  controllers: [AiAssistantController],
  providers: [AiAssistantService, GrokService],
  exports: [AiAssistantService],
})
export class AiAssistantModule {}

