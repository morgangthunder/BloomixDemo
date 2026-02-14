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

export enum NotificationType {
  DIRECT_MESSAGE = 'direct_message',
  NEW_CONTENT_RELEASED = 'new_content_released',
  ADMIN_ANNOUNCEMENT = 'admin_announcement',
  PROGRESS_REMINDER = 'progress_reminder',
  ASSIGNMENT_SCORE_UPDATE = 'assignment_score_update',
  HUB_INVITE = 'hub_invite',
  ASSIGNMENT_MARKED_DONE = 'assignment_marked_done',
  DEADLINE_REMINDER = 'deadline_reminder',
}

@Entity('notifications')
@Index(['userId', 'readAt'])
@Index(['userId', 'type'])
@Index(['toUserId', 'type']) // For direct messages
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index()
  userId: string; // Recipient

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', nullable: true, name: 'hub_id' })
  hubId: string | null;

  @Column({
    type: 'enum',
    enum: NotificationType,
    name: 'type',
  })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'action_url' })
  actionUrl: string | null;

  // For direct_message type
  @Column({ type: 'uuid', nullable: true, name: 'from_user_id' })
  fromUserId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'to_user_id' })
  toUserId: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'read_at' })
  readAt: Date | null;

  /** Email delivery status: 'pending' | 'sent' | 'failed' | null (no email requested) */
  @Column({ type: 'varchar', length: 32, nullable: true, name: 'email_delivery_status' })
  emailDeliveryStatus: string | null;

  /** True if "Also send by email" was checked when sending this message */
  @Column({ type: 'boolean', default: false, name: 'email_requested' })
  emailRequested: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
