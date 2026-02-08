import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_personalization')
export class UserPersonalization {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'full_name', type: 'varchar', length: 255, nullable: true })
  fullName?: string;

  @Column({ name: 'age_range', type: 'varchar', length: 20, nullable: true })
  ageRange?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  gender?: string;

  @Column('text', { name: 'favourite_tv_movies', array: true, nullable: true })
  favouriteTvMovies: string[] = [];

  @Column('text', { name: 'hobbies_interests', array: true, nullable: true })
  hobbiesInterests: string[] = [];

  @Column('text', { name: 'learning_areas', array: true, nullable: true })
  learningAreas: string[] = [];

  @Column({
    name: 'onboarding_completed_at',
    type: 'timestamp',
    nullable: true,
  })
  onboardingCompletedAt?: Date;

  @Column({ name: 'skipped_onboarding', type: 'boolean', default: false })
  skippedOnboarding: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
