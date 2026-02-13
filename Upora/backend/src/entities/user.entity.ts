import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../common/enums/approval-status.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true, name: 'first_name' })
  username: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @Column({ nullable: true, name: 'subscription_tier' })
  subscription: string;

  @Column({ type: 'int', default: 0, name: 'token_usage' })
  grokTokensUsed: number;

  @Column({ type: 'int', default: 10000, name: 'token_limit' })
  grokTokenLimit: number;

  @Column({ name: 'subscription_renewal_at', type: 'timestamp', nullable: true })
  subscriptionRenewalAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
