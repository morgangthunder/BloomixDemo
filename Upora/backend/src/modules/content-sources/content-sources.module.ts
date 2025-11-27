import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentSourcesController } from './content-sources.controller';
import { ContentSourcesService } from './content-sources.service';
import { ContentSource } from '../../entities/content-source.entity';
import { LessonDataLink } from '../../entities/lesson-data-link.entity';
import { ProcessedContentOutput } from '../../entities/processed-content-output.entity';
import { YouTubeService } from '../../services/youtube.service';
import { ContentAnalyzerModule } from '../../services/content-analyzer.module';
import { AutoPopulatorModule } from '../../services/auto-populator.module';
import { FileStorageService } from '../../services/file-storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContentSource, LessonDataLink, ProcessedContentOutput]),
    ContentAnalyzerModule,
    AutoPopulatorModule,
  ],
  controllers: [ContentSourcesController],
  providers: [ContentSourcesService, YouTubeService, FileStorageService],
  exports: [ContentSourcesService],
})
export class ContentSourcesModule {}

