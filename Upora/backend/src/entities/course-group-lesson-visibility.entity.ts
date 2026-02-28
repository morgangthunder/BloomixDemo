import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { LessonGroup } from './lesson-group.entity';
import { Lesson } from './lesson.entity';

/**
 * Controls which lessons within a course are visible to a specific course group.
 * All lessons are visible by default; rows only need to exist for overrides.
 */
@Entity('course_group_lesson_visibility')
@Index(['courseGroupId', 'lessonId'], { unique: true })
export class CourseGroupLessonVisibility {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'course_group_id' })
  courseGroupId: string;

  @ManyToOne(() => LessonGroup)
  @JoinColumn({ name: 'course_group_id' })
  courseGroup: LessonGroup;

  @Column({ type: 'uuid', name: 'lesson_id' })
  lessonId: string;

  @ManyToOne(() => Lesson)
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @Column({ type: 'boolean', default: true, name: 'is_visible' })
  isVisible: boolean;
}
