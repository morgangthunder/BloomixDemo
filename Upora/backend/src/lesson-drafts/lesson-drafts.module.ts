import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonDraftsController } from './lesson-drafts.controller';
import { LessonDraftsService } from './lesson-drafts.service';
import { LessonDraft } from './entities/lesson-draft.entity';
import { Lesson } from '../entities/lesson.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([LessonDraft, Lesson])
  ],
  controllers: [LessonDraftsController],
  providers: [LessonDraftsService],
  exports: [LessonDraftsService]
})
export class LessonDraftsModule {}

