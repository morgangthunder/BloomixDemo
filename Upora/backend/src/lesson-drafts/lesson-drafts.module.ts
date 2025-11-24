import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonDraftsController } from './lesson-drafts.controller';
import { LessonDraftsService } from './lesson-drafts.service';
import { LessonDraft } from './entities/lesson-draft.entity';
import { Lesson } from '../entities/lesson.entity';
import { ContentSource } from '../entities/content-source.entity';
import { LessonDataLink } from '../entities/lesson-data-link.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LessonDraft, Lesson, ContentSource, LessonDataLink])
  ],
  controllers: [LessonDraftsController],
  providers: [LessonDraftsService],
  exports: [LessonDraftsService]
})
export class LessonDraftsModule {}

