import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonEditorController } from './lesson-editor.controller';
import { LessonEditorService } from './lesson-editor.service';
import { ProcessedContentOutput } from '../../entities/processed-content-output.entity';
import { ScriptBlock } from '../../entities/script-block.entity';
import { Lesson } from '../../entities/lesson.entity';
import { ContentSource } from '../../entities/content-source.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProcessedContentOutput,
      ScriptBlock,
      Lesson,
      ContentSource,
    ]),
  ],
  controllers: [LessonEditorController],
  providers: [LessonEditorService],
  exports: [LessonEditorService],
})
export class LessonEditorModule {}

