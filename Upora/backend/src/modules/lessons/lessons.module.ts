import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { LessonLoaderService } from './lesson-loader.service';
import { Lesson } from '../../entities/lesson.entity';
import { User } from '../../entities/user.entity';
import { Usage } from '../../entities/usage.entity';
import { UserInteractionProgress } from '../../entities/user-interaction-progress.entity';
import { SuperAdminModule } from '../super-admin/super-admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lesson, User, Usage, UserInteractionProgress]),
    SuperAdminModule,
  ],
  controllers: [LessonsController],
  providers: [LessonsService, LessonLoaderService],
  exports: [LessonsService, LessonLoaderService],
})
export class LessonsModule {}
