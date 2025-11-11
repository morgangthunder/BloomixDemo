import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ContentAnalyzerService } from './content-analyzer.service';
import { InteractionType } from '../entities/interaction-type.entity';
import { ContentSource } from '../entities/content-source.entity';
import { ProcessedContentOutput } from '../entities/processed-content-output.entity';
import { LlmGenerationLog } from '../entities/llm-generation-log.entity';
import { LlmProvider } from '../entities/llm-provider.entity';
import { AiPrompt } from '../entities/ai-prompt.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([InteractionType, ContentSource, ProcessedContentOutput, LlmGenerationLog, LlmProvider, AiPrompt]),
  ],
  providers: [ContentAnalyzerService],
  exports: [ContentAnalyzerService],
})
export class ContentAnalyzerModule {}

