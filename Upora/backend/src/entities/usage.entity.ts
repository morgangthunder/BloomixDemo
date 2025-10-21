import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Lesson } from './lesson.entity';

@Entity('usages')
export class Usage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  lessonId: string;

  @ManyToOne(() => Lesson)
  @JoinColumn({ name: 'lessonId' })
  lesson: Lesson;

  @Column({ type: 'uuid', nullable: true })
  interactionTypeId: string;

  @Column({ type: 'uuid', nullable: true })
  workflowId: string;

  @Column()
  usageType: string; // 'lesson_view', 'interaction_run', 'workflow_execution'

  @Column({ type: 'int', default: 0 })
  grokTokensUsed: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0 })
  commissionEarned: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn()
  createdAt: Date;
}
