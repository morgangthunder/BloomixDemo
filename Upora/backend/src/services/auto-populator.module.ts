import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AutoPopulatorService } from './auto-populator.service';
import { LlmProvider } from '../entities/llm-provider.entity';
import { LlmGenerationLog } from '../entities/llm-generation-log.entity';
import { AiPrompt } from '../entities/ai-prompt.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LlmProvider, LlmGenerationLog, AiPrompt]),
    HttpModule,
  ],
  providers: [AutoPopulatorService],
  exports: [AutoPopulatorService],
})
export class AutoPopulatorModule {}

