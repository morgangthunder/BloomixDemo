import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ContentAnalyzerService } from './content-analyzer.service';
import { InteractionType } from '../entities/interaction-type.entity';
import { ContentSource } from '../entities/content-source.entity';
import { ProcessedContentOutput } from '../entities/processed-content-output.entity';
import { LlmGenerationLog } from '../entities/llm-generation-log.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([InteractionType, ContentSource, ProcessedContentOutput, LlmGenerationLog]),
  ],
  providers: [ContentAnalyzerService],
  exports: [ContentAnalyzerService],
})
export class ContentAnalyzerModule {}

