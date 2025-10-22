import { Entity, Column, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('pricing_config')
export class PricingConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  provider: string; // 'xai', 'openai', 'anthropic'

  @Column({ name: 'base_cost_per_1k', type: 'decimal', precision: 10, scale: 6 })
  baseCostPer1k: number;

  @Column({ name: 'margin_multiplier', type: 'decimal', precision: 4, scale: 2, default: 1.5 })
  marginMultiplier: number;

  @Column({ name: 'customer_cost_per_1k', type: 'decimal', precision: 10, scale: 6 })
  customerCostPer1k: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

