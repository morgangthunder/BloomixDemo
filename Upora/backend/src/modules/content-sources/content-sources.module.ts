import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentSourcesController } from './content-sources.controller';
import { ContentSourcesService } from './content-sources.service';
import { ContentSource } from '../../entities/content-source.entity';
import { LessonDataLink } from '../../entities/lesson-data-link.entity';
import { WeaviateService } from '../../services/weaviate.service';
import { YouTubeService } from '../../services/youtube.service';
import { ContentAnalyzerModule } from '../../services/content-analyzer.module';
import { AutoPopulatorModule } from '../../services/auto-populator.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContentSource, LessonDataLink]),
    ContentAnalyzerModule,
    AutoPopulatorModule,
  ],
  controllers: [ContentSourcesController],
  providers: [ContentSourcesService, WeaviateService, YouTubeService],
  exports: [ContentSourcesService],
})
export class ContentSourcesModule {}

