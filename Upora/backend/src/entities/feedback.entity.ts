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

export enum FeedbackStatus {
  PENDING = 'pending',
  REPLIED = 'replied',
  ADDRESSED = 'addressed',
  WONT_DO = 'wont_do',
  ARCHIVED = 'archived',
}

@Entity('feedback')
@Index(['userId'])
@Index(['status'])
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Column({
    type: 'varchar',
    length: 32,
    default: FeedbackStatus.PENDING,
  })
  status: FeedbackStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('feedback_replies')
@Index(['feedbackId'])
export class FeedbackReply {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'feedback_id' })
  feedbackId: string;

  @ManyToOne(() => Feedback)
  @JoinColumn({ name: 'feedback_id' })
  feedback: Feedback;

  /** Who sent this reply (super-admin or the user themselves) */
  @Column({ type: 'uuid', name: 'from_user_id' })
  fromUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'from_user_id' })
  fromUser: User;

  @Column({ type: 'text' })
  body: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
