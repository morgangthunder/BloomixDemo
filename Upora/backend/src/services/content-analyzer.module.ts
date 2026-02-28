import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ContentAnalyzerService } from './content-analyzer.service';
import { ContentCacheService } from './content-cache.service';
import { InteractionType } from '../entities/interaction-type.entity';
import { ContentSource } from '../entities/content-source.entity';
import { ProcessedContentOutput } from '../entities/processed-content-output.entity';
import { ProcessedContentCache } from '../entities/processed-content-cache.entity';
import { GeneratedImage } from '../entities/generated-image.entity';
import { UserPersonalization } from '../entities/user-personalization.entity';
import { LlmGenerationLog } from '../entities/llm-generation-log.entity';
import { LlmProvider } from '../entities/llm-provider.entity';
import { AiPrompt } from '../entities/ai-prompt.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      InteractionType, ContentSource, ProcessedContentOutput,
      ProcessedContentCache, GeneratedImage, UserPersonalization,
      LlmGenerationLog, LlmProvider, AiPrompt,
    ]),
  ],
  providers: [ContentAnalyzerService, ContentCacheService],
  exports: [ContentAnalyzerService, ContentCacheService],
})
export class ContentAnalyzerModule {}

