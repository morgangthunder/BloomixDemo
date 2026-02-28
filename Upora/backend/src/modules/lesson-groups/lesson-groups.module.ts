import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonGroupsController } from './lesson-groups.controller';
import { LessonGroupsService } from './lesson-groups.service';
import { LessonGroup, GroupMember } from '../../entities/lesson-group.entity';
import { Assignment, AssignmentSubmission, UserLessonDeadline } from '../../entities/assignment.entity';
import { CourseGroupLessonVisibility } from '../../entities/course-group-lesson-visibility.entity';
import { Course } from '../../entities/course.entity';
import { Lesson } from '../../entities/lesson.entity';
import { User } from '../../entities/user.entity';
import { Usage } from '../../entities/usage.entity';
import { UserInteractionProgress } from '../../entities/user-interaction-progress.entity';
import { Notification } from '../../entities/notification.entity';
import { FileStorageService } from '../../services/file-storage.service';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LessonGroup,
      GroupMember,
      Assignment,
      AssignmentSubmission,
      UserLessonDeadline,
      CourseGroupLessonVisibility,
      Course,
      Lesson,
      User,
      Usage,
      UserInteractionProgress,
      Notification,
    ]),
    ChatModule,
  ],
  controllers: [LessonGroupsController],
  providers: [LessonGroupsService, FileStorageService],
  exports: [LessonGroupsService],
})
export class LessonGroupsModule {}
