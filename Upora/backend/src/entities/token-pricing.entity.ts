import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('token_pricing')
export class TokenPricing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  tier: string; // 'free', 'pro', 'enterprise'

  @Column({ name: 'monthly_tokens' })
  monthlyTokens: number;

  @Column({ name: 'price_cents' })
  priceCents: number;

  @Column({ name: 'margin_multiplier', type: 'decimal', precision: 4, scale: 2, default: 1.5 })
  marginMultiplier: number;

  @Column({ name: 'base_cost_per_1k_tokens', type: 'decimal', precision: 10, scale: 6, default: 0.0015 })
  baseCostPer1kTokens: number;

  @Column({ name: 'customer_cost_per_1k_tokens', type: 'decimal', precision: 10, scale: 6 })
  customerCostPer1kTokens: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

