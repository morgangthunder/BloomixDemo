import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApprovalStatus } from '../common/enums/approval-status.enum';
import { User } from './user.entity';
import { Course } from './course.entity';

@Entity('lessons')
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true, name: 'thumbnail_url' })
  thumbnailUrl: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  difficulty: string;

  @Column({ type: 'int', nullable: true, name: 'duration_minutes' })
  durationMinutes: number;

  @Column({ type: 'text', nullable: true, array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'jsonb' })
  data: {
    stages: any[];
    prompts?: any[];
    metadata?: any;
  };

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  status: ApprovalStatus;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ type: 'int', default: 0, name: 'view_count' })
  views: number;

  @Column({ type: 'int', default: 0, name: 'completion_count' })
  completions: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'rating_average' })
  completionRate: number;

  @Column({ name: 'course_id', type: 'uuid', nullable: true })
  courseId: string | null;

  @ManyToOne(() => Course, course => course.lessons, { nullable: true })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
