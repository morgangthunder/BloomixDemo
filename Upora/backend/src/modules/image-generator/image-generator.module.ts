import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImageGeneratorController } from './image-generator.controller';
import { ImageGeneratorService } from '../../services/image-generator.service';
import { AiPrompt } from '../../entities/ai-prompt.entity';
import { LlmGenerationLog } from '../../entities/llm-generation-log.entity';
import { LlmProvider } from '../../entities/llm-provider.entity';
import { GeneratedImage } from '../../entities/generated-image.entity';
import { FileStorageService } from '../../services/file-storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiPrompt, LlmGenerationLog, LlmProvider, GeneratedImage]),
  ],
  controllers: [ImageGeneratorController],
  providers: [ImageGeneratorService, FileStorageService],
  exports: [ImageGeneratorService],
})
export class ImageGeneratorModule {}

