import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Hub } from './hub.entity';

export enum HubMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member',
}

export enum HubMemberStatus {
  INVITED = 'invited',
  JOINED = 'joined',
  REMOVED = 'removed',
}

@Entity('hub_members')
@Unique(['hubId', 'userId'])
@Index(['hubId'])
@Index(['userId'])
export class HubMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hub_id', type: 'uuid' })
  hubId: string;

  @ManyToOne(() => Hub, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hub_id' })
  hub: Hub;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 50, default: HubMemberRole.MEMBER })
  role: HubMemberRole;

  @Column({ type: 'varchar', length: 50, default: HubMemberStatus.INVITED })
  status: HubMemberStatus;

  @Column({ name: 'invited_by', type: 'uuid', nullable: true })
  invitedBy: string | null;

  @Column({ name: 'joined_at', type: 'timestamp', nullable: true })
  joinedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
