import { Entity, PrimaryColumn, Column, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_public_profiles')
export class UserPublicProfile {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Public Data (user-controlled)
  @Column({ name: 'display_name', type: 'varchar', length: 255, nullable: true })
  displayName?: string;

  @Column({ type: 'jsonb', nullable: true })
  preferences?: Record<string, any>; // e.g., {theme: "dark", language: "en"}

  @Column({ name: 'public_avatar_url', type: 'varchar', length: 500, nullable: true })
  publicAvatarUrl?: string;

  // Privacy flags
  @Column({ name: 'share_name', type: 'boolean', default: false })
  shareName: boolean;

  @Column({ name: 'share_preferences', type: 'boolean', default: false })
  sharePreferences: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

