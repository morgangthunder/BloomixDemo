import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Lesson } from './lesson.entity';
import { Course } from './course.entity';

/**
 * A unified group entity — supports both lesson groups and course groups.
 *
 * - Lesson group:          lesson_id set, course_id null, parent_course_group_id null
 * - Course group:          course_id set, lesson_id null
 * - Auto-created (child):  lesson_id set, course_id set, parent_course_group_id set
 */
@Entity('lesson_groups')
@Index(['lessonId'])
@Index(['courseId'])
@Index(['createdBy'])
@Index(['lessonId', 'isDefault'])
@Index(['parentCourseGroupId'])
export class LessonGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Set for lesson groups and auto-created child groups. NULL for course-level groups. */
  @Column({ type: 'uuid', name: 'lesson_id', nullable: true })
  lessonId: string | null;

  @ManyToOne(() => Lesson, { nullable: true })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  /** Set for course groups and auto-created child groups. NULL for standalone lesson groups. */
  @Column({ type: 'uuid', name: 'course_id', nullable: true })
  courseId: string | null;

  @ManyToOne(() => Course, { nullable: true })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  /** If this is an auto-created lesson group under a course group, references the parent. */
  @Column({ type: 'uuid', name: 'parent_course_group_id', nullable: true })
  parentCourseGroupId: string | null;

  @ManyToOne(() => LessonGroup, { nullable: true })
  @JoinColumn({ name: 'parent_course_group_id' })
  parentCourseGroup: LessonGroup;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Default groups have dynamic membership (all engagers). Custom groups use group_members. */
  @Column({ type: 'boolean', default: false, name: 'is_default' })
  isDefault: boolean;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'tenant_id' })
  tenantId: string | null;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/**
 * Membership in a custom lesson group.
 * Default groups do NOT use this table — their membership is derived from engagers.
 */
@Entity('group_members')
@Index(['groupId'])
@Index(['userId'])
@Index(['groupId', 'userId'], { unique: true })
export class GroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'group_id' })
  groupId: string;

  @ManyToOne(() => LessonGroup)
  @JoinColumn({ name: 'group_id' })
  group: LessonGroup;

  /** User ID — null if invited by email before the user has signed up */
  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** Email used for invitation (especially when user doesn't exist yet) */
  @Column({ type: 'varchar', length: 320, nullable: true })
  email: string | null;

  /** Role within the group */
  @Column({ type: 'varchar', length: 32, default: 'member' })
  role: string;

  /** Status: invited, joined, declined */
  @Column({ type: 'varchar', length: 32, default: 'joined' })
  status: string;

  @Column({ type: 'uuid', nullable: true, name: 'invited_by' })
  invitedBy: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'invited_at' })
  invitedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'joined_at' })
  joinedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
