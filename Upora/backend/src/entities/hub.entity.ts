import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum HubType {
  UPORA_DOMAIN = 'upora_domain',
  EMBEDDED_BLOB = 'embedded_blob',
  DEDICATED_DB = 'dedicated_db',
}

export enum HubStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived',
}

@Entity('hubs')
@Index(['tenantId'])
@Index(['slug'], { unique: true })
export class Hub {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 50, default: HubType.UPORA_DOMAIN })
  type: HubType;

  @Column({ name: 'is_public', type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string | null;

  @Column({ name: 'banner_url', type: 'text', nullable: true })
  bannerUrl: string | null;

  @Column({ name: 'theme_config', type: 'jsonb', nullable: true })
  themeConfig: Record<string, any> | null;

  @Column({ name: 'db_config', type: 'jsonb', nullable: true })
  dbConfig: Record<string, any> | null;

  /**
   * SSO/auth configuration for the hub.
   * { provider: 'upora' | 'oidc',
   *   oidcIssuerUrl, oidcClientId, oidcClientSecret (encrypted),
   *   emailClaim, nameClaim }
   */
  @Column({ name: 'auth_config', type: 'jsonb', nullable: true })
  authConfig: Record<string, any> | null;

  /**
   * Shelf configuration for the hub homepage.
   * { shelves: [{ id, type, label, enabled, sortOrder, config? }] }
   */
  @Column({ name: 'shelf_config', type: 'jsonb', nullable: true })
  shelfConfig: Record<string, any> | null;

  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ type: 'varchar', length: 50, default: HubStatus.ACTIVE })
  status: HubStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
