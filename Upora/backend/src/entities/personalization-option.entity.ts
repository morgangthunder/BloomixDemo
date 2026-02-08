import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface PersonalizationOptionItem {
  id: string;
  label: string;
}

@Entity('personalization_options')
export class PersonalizationOption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  category: string;

  @Column({ name: 'age_range', type: 'varchar', length: 50, default: '' })
  ageRange: string;

  @Column({ type: 'varchar', length: 50, default: '' })
  gender: string;

  @Column({ type: 'jsonb', default: [] })
  options: PersonalizationOptionItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
