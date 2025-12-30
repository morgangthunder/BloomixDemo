import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImageGeneratorController } from './image-generator.controller';
import { ImageGeneratorService } from '../../services/image-generator.service';
import { AiPrompt } from '../../entities/ai-prompt.entity';
import { LlmGenerationLog } from '../../entities/llm-generation-log.entity';
import { LlmProvider } from '../../entities/llm-provider.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AiPrompt, LlmGenerationLog, LlmProvider])],
  controllers: [ImageGeneratorController],
  providers: [ImageGeneratorService],
  exports: [ImageGeneratorService],
})
export class ImageGeneratorModule {}

