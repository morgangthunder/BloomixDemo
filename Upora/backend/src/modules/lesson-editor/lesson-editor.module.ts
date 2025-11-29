import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonEditorController } from './lesson-editor.controller';
import { LessonEditorService } from './lesson-editor.service';
import { ProcessedContentOutput } from '../../entities/processed-content-output.entity';
import { ScriptBlock } from '../../entities/script-block.entity';
import { Lesson } from '../../entities/lesson.entity';
import { ContentSource } from '../../entities/content-source.entity';
import { LessonDataLink } from '../../entities/lesson-data-link.entity';
import { LessonDataService } from '../../services/lesson-data.service';
import { ContentValidationService } from '../../services/content-validation.service';
import { WeaviateModule } from '../../services/weaviate.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProcessedContentOutput,
      ScriptBlock,
      Lesson,
      ContentSource,
      LessonDataLink,
    ]),
    WeaviateModule, // Import WeaviateModule for WeaviateService
  ],
  controllers: [LessonEditorController],
  providers: [LessonEditorService, LessonDataService, ContentValidationService],
  exports: [LessonEditorService, LessonDataService, ContentValidationService],
})
export class LessonEditorModule {}

