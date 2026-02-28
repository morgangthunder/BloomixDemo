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

// ─── Assignment Types ───
// offline      = teacher manually marks complete (e.g. "present your project")
// file         = student uploads a file (homework, essay, etc.)
// interaction  = auto-completed when student finishes lesson interactions
export enum AssignmentType {
  OFFLINE = 'offline',
  FILE = 'file',
  INTERACTION = 'interaction',
}

// ─── Submission Status ───
export enum SubmissionStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  LATE = 'late',
  RESUBMIT_REQUESTED = 'resubmit_requested',
}

/**
 * An assignment defined by a lesson creator.
 * Optionally scoped to a group; null group_id = applies to all groups.
 */
@Entity('assignments')
@Index(['lessonId'])
@Index(['groupId'])
@Index(['createdBy'])
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'lesson_id' })
  lessonId: string;

  @ManyToOne(() => Lesson)
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  /** Null = applies to all groups for this lesson */
  @Column({ type: 'uuid', nullable: true, name: 'group_id' })
  groupId: string | null;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'varchar',
    length: 32,
    default: AssignmentType.OFFLINE,
  })
  type: AssignmentType;

  /** For file assignments: comma-separated allowed extensions, e.g. "pdf,docx,png,jpg" */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'allowed_file_types' })
  allowedFileTypes: string | null;

  /** Max file size in bytes (default 50MB) */
  @Column({ type: 'int', nullable: true, name: 'max_file_size_bytes', default: 52428800 })
  maxFileSizeBytes: number | null;

  /** Maximum score for this assignment (default 100) */
  @Column({ type: 'int', default: 100, name: 'max_score' })
  maxScore: number;

  /** Optional: link to a stage/substage in the lesson (for interaction-type assignments) */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'stage_id' })
  stageId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'substage_id' })
  substageId: string | null;

  /** Order index for display sorting */
  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder: number;

  /** Whether this assignment is visible to students */
  @Column({ type: 'boolean', default: true, name: 'is_published' })
  isPublished: boolean;

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
 * A student's submission for an assignment.
 * For offline: just marked done. For file: has file URL. For interaction: auto-tracked.
 */
@Entity('assignment_submissions')
@Index(['assignmentId'])
@Index(['userId'])
@Index(['assignmentId', 'userId'])
export class AssignmentSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'assignment_id' })
  assignmentId: string;

  @ManyToOne(() => Assignment)
  @JoinColumn({ name: 'assignment_id' })
  assignment: Assignment;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'varchar',
    length: 32,
    default: SubmissionStatus.NOT_STARTED,
  })
  status: SubmissionStatus;

  /** File URL (for file-type assignments) */
  @Column({ type: 'text', nullable: true, name: 'file_url' })
  fileUrl: string | null;

  /** Original filename */
  @Column({ type: 'varchar', length: 512, nullable: true, name: 'file_name' })
  fileName: string | null;

  /** File size in bytes */
  @Column({ type: 'int', nullable: true, name: 'file_size' })
  fileSize: number | null;

  /** Student's optional comment when submitting */
  @Column({ type: 'text', nullable: true, name: 'student_comment' })
  studentComment: string | null;

  /** Score given by creator (0 to maxScore) */
  @Column({ type: 'int', nullable: true })
  score: number | null;

  /** Creator's feedback/comment when grading */
  @Column({ type: 'text', nullable: true, name: 'grader_feedback' })
  graderFeedback: string | null;

  /** Who graded this submission */
  @Column({ type: 'uuid', nullable: true, name: 'graded_by' })
  gradedBy: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'graded_at' })
  gradedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'submitted_at' })
  submittedAt: Date | null;

  /** Flag for late submissions */
  @Column({ type: 'boolean', default: false, name: 'is_late' })
  isLate: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/**
 * Per-user deadline for a lesson (set by creator or admin).
 * Optionally linked to a group and/or course.
 */
@Entity('user_lesson_deadlines')
@Index(['userId'])
@Index(['lessonId'])
@Index(['userId', 'lessonId'])
@Index(['groupId'])
export class UserLessonDeadline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', name: 'lesson_id' })
  lessonId: string;

  @ManyToOne(() => Lesson)
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  /** Optional group context */
  @Column({ type: 'uuid', nullable: true, name: 'group_id' })
  groupId: string | null;

  /** Optional course context */
  @Column({ type: 'uuid', nullable: true, name: 'course_id' })
  courseId: string | null;

  @Column({ type: 'timestamp', name: 'deadline_at' })
  deadlineAt: Date;

  @Column({ type: 'uuid', name: 'set_by_user_id' })
  setByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'set_by_user_id' })
  setByUser: User;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
