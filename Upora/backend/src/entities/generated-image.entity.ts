import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Generated Image Entity
 * 
 * Stores metadata about images generated for lessons.
 * Images are stored in MinIO/S3, this entity tracks:
 * - Which lesson the image belongs to
 * - Which account created it
 * - Image URL in storage
 * - Dimensions and metadata
 */
@Entity('generated_images')
@Index(['lessonId'])
@Index(['accountId'])
@Index(['lessonId', 'accountId'])
export class GeneratedImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'lesson_id' })
  lessonId: string;

  @Column({ type: 'uuid', name: 'account_id' })
  accountId: string; // Account that created the lesson or generated the image

  @Column({ type: 'text', name: 'image_url' })
  imageUrl: string; // URL to image in MinIO/S3

  @Column({ type: 'varchar', length: 50, name: 'mime_type', default: 'image/png' })
  mimeType: string;

  @Column({ type: 'int', name: 'width', nullable: true })
  width: number | null;

  @Column({ type: 'int', name: 'height', nullable: true })
  height: number | null;

  @Column({ type: 'text', name: 'prompt', nullable: true })
  prompt: string | null; // The prompt used to generate the image

  @Column({ type: 'uuid', name: 'substage_id', nullable: true })
  substageId: string | null; // Optional: which substage generated this image

  @Column({ type: 'uuid', name: 'interaction_id', nullable: true })
  interactionId: string | null; // Optional: which interaction generated this image

  @Column({ type: 'jsonb', name: 'metadata', nullable: true })
  metadata: Record<string, any> | null; // Additional metadata (model used, tokens, etc.)

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

