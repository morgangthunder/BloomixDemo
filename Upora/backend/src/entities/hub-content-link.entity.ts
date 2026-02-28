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
import { Hub } from './hub.entity';
import { Lesson } from './lesson.entity';
import { Course } from './course.entity';
import { User } from './user.entity';

export enum HubContentStatus {
  PUBLISHED = 'published',
  DRAFT = 'draft',
  REMOVED = 'removed',
}

@Entity('hub_content_links')
@Index(['hubId'])
@Index(['lessonId'])
@Index(['courseId'])
export class HubContentLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'hub_id', type: 'uuid' })
  hubId: string;

  @ManyToOne(() => Hub, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hub_id' })
  hub: Hub;

  @Column({ name: 'lesson_id', type: 'uuid', nullable: true })
  lessonId: string | null;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @Column({ name: 'course_id', type: 'uuid', nullable: true })
  courseId: string | null;

  @ManyToOne(() => Course, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ type: 'varchar', length: 50, default: HubContentStatus.PUBLISHED })
  status: HubContentStatus;

  @Column({ name: 'linked_by', type: 'uuid' })
  linkedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'linked_by' })
  linker: User;

  @Column({ name: 'released_at', type: 'timestamp', nullable: true })
  releasedAt: Date | null;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
