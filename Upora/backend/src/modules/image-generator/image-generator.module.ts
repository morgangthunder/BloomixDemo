import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImageGeneratorController } from './image-generator.controller';
import { ImageGeneratorService } from '../../services/image-generator.service';
import { ContentCacheService } from '../../services/content-cache.service';
import { AiPrompt } from '../../entities/ai-prompt.entity';
import { LlmGenerationLog } from '../../entities/llm-generation-log.entity';
import { LlmProvider } from '../../entities/llm-provider.entity';
import { GeneratedImage } from '../../entities/generated-image.entity';
import { ProcessedContentCache } from '../../entities/processed-content-cache.entity';
import { UserPersonalization } from '../../entities/user-personalization.entity';
import { FileStorageService } from '../../services/file-storage.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiPrompt, LlmGenerationLog, LlmProvider, GeneratedImage,
      ProcessedContentCache, UserPersonalization,
    ]),
    UsersModule,
  ],
  controllers: [ImageGeneratorController],
  providers: [ImageGeneratorService, ContentCacheService, FileStorageService],
  exports: [ImageGeneratorService, ContentCacheService],
})
export class ImageGeneratorModule {}

