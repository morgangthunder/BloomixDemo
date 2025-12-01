import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InteractionInstanceData } from '../entities/interaction-instance-data.entity';
import { UserInteractionProgress } from '../entities/user-interaction-progress.entity';
import { UserPublicProfile } from '../entities/user-public-profile.entity';
import { InteractionType } from '../entities/interaction-type.entity';

export interface SaveInstanceDataDto {
  lessonId: string;
  stageId: string;
  substageId: string;
  interactionTypeId: string;
  processedContentId?: string;
  instanceData: Record<string, any>;
}

export interface GetInstanceDataHistoryDto {
  interactionTypeId: string;
  lessonId: string;
  substageId: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}

export interface SaveUserProgressDto {
  lessonId: string;
  stageId: string;
  substageId: string;
  interactionTypeId: string;
  score?: number;
  timeTakenSeconds?: number;
  interactionEvents?: Array<{ type: string; timestamp: Date; data: Record<string, any> }>;
  customData?: Record<string, any>;
  completed?: boolean;
}

@Injectable()
export class InteractionDataService {
  constructor(
    @InjectRepository(InteractionInstanceData)
    private instanceDataRepo: Repository<InteractionInstanceData>,
    @InjectRepository(UserInteractionProgress)
    private userProgressRepo: Repository<UserInteractionProgress>,
    @InjectRepository(UserPublicProfile)
    private publicProfileRepo: Repository<UserPublicProfile>,
    @InjectRepository(InteractionType)
    private interactionTypeRepo: Repository<InteractionType>,
  ) {}

  /**
   * Save instance data (anonymous, all students)
   * Accessible to all students when interacting
   */
  async saveInstanceData(dto: SaveInstanceDataDto): Promise<void> {
    // Validate schema if defined
    const interactionType = await this.interactionTypeRepo.findOne({
      where: { id: dto.interactionTypeId },
    });

    if (interactionType?.instanceDataSchema) {
      this.validateInstanceData(dto.instanceData, interactionType.instanceDataSchema);
    }

    const instanceData = this.instanceDataRepo.create({
      lessonId: dto.lessonId,
      stageId: dto.stageId,
      substageId: dto.substageId,
      interactionTypeId: dto.interactionTypeId,
      processedContentId: dto.processedContentId,
      instanceData: dto.instanceData,
    });

    await this.instanceDataRepo.save(instanceData);
  }

  /**
   * Get instance data history (accessible to interaction builders and super-admins only)
   */
  async getInstanceDataHistory(
    dto: GetInstanceDataHistoryDto,
    userId: string,
    userRole: string,
  ): Promise<InteractionInstanceData[]> {
    // Check permissions: only interaction builder (of this type) or super-admin
    const interactionType = await this.interactionTypeRepo.findOne({
      where: { id: dto.interactionTypeId },
    });

    if (!interactionType) {
      throw new NotFoundException(`Interaction type ${dto.interactionTypeId} not found`);
    }

    // TODO: Implement proper permission check
    // For now, allow if user is super-admin or interaction-builder
    // In production, check if user created this interaction type
    if (userRole !== 'super-admin' && userRole !== 'interaction-builder') {
      throw new ForbiddenException('Only interaction builders and super-admins can access instance data history');
    }

    const query = this.instanceDataRepo
      .createQueryBuilder('data')
      .where('data.interactionTypeId = :interactionTypeId', { interactionTypeId: dto.interactionTypeId })
      .andWhere('data.lessonId = :lessonId', { lessonId: dto.lessonId })
      .andWhere('data.substageId = :substageId', { substageId: dto.substageId });

    if (dto.dateFrom) {
      query.andWhere('data.createdAt >= :dateFrom', { dateFrom: dto.dateFrom });
    }

    if (dto.dateTo) {
      query.andWhere('data.createdAt <= :dateTo', { dateTo: dto.dateTo });
    }

    query.orderBy('data.createdAt', 'DESC');

    if (dto.limit) {
      query.limit(dto.limit);
    }

    return await query.getMany();
  }

  /**
   * Save or update user progress
   */
  async saveUserProgress(
    userId: string,
    tenantId: string,
    dto: SaveUserProgressDto,
  ): Promise<UserInteractionProgress> {
    // Validate schema if defined
    const interactionType = await this.interactionTypeRepo.findOne({
      where: { id: dto.interactionTypeId },
    });

    if (interactionType?.userProgressSchema && dto.customData) {
      this.validateUserProgressData(dto.customData, interactionType.userProgressSchema);
    }

    // Find existing progress or create new
    let progress = await this.userProgressRepo.findOne({
      where: {
        userId,
        lessonId: dto.lessonId,
        stageId: dto.stageId,
        substageId: dto.substageId,
        interactionTypeId: dto.interactionTypeId,
      },
    });

    if (progress) {
      // Update existing
      progress.attempts += 1;
      if (dto.completed !== undefined) {
        progress.completed = dto.completed;
        if (dto.completed && !progress.completeTimestamp) {
          progress.completeTimestamp = new Date();
        }
      }
      if (dto.score !== undefined) {
        progress.score = dto.score;
      }
      if (dto.timeTakenSeconds !== undefined) {
        progress.timeTakenSeconds = dto.timeTakenSeconds;
      }
      if (dto.interactionEvents) {
        progress.interactionEvents = dto.interactionEvents;
      }
      if (dto.customData) {
        progress.customData = { ...progress.customData, ...dto.customData };
      }
    } else {
      // Create new
      progress = this.userProgressRepo.create({
        userId,
        tenantId,
        lessonId: dto.lessonId,
        stageId: dto.stageId,
        substageId: dto.substageId,
        interactionTypeId: dto.interactionTypeId,
        startTimestamp: new Date(),
        attempts: 1,
        completed: dto.completed || false,
        score: dto.score,
        timeTakenSeconds: dto.timeTakenSeconds,
        interactionEvents: dto.interactionEvents,
        customData: dto.customData,
      });
    }

    return await this.userProgressRepo.save(progress);
  }

  /**
   * Get user progress for current interaction
   */
  async getUserProgress(
    userId: string,
    lessonId: string,
    stageId: string,
    substageId: string,
    interactionTypeId: string,
  ): Promise<UserInteractionProgress | null> {
    return await this.userProgressRepo.findOne({
      where: {
        userId,
        lessonId,
        stageId,
        substageId,
        interactionTypeId,
      },
    });
  }

  /**
   * Mark interaction as completed
   */
  async markCompleted(
    userId: string,
    lessonId: string,
    stageId: string,
    substageId: string,
    interactionTypeId: string,
  ): Promise<UserInteractionProgress> {
    const progress = await this.getUserProgress(userId, lessonId, stageId, substageId, interactionTypeId);

    if (!progress) {
      throw new NotFoundException('User progress not found');
    }

    progress.completed = true;
    progress.completeTimestamp = new Date();

    return await this.userProgressRepo.save(progress);
  }

  /**
   * Increment attempts
   */
  async incrementAttempts(
    userId: string,
    lessonId: string,
    stageId: string,
    substageId: string,
    interactionTypeId: string,
  ): Promise<UserInteractionProgress> {
    const progress = await this.getUserProgress(userId, lessonId, stageId, substageId, interactionTypeId);

    if (!progress) {
      throw new NotFoundException('User progress not found');
    }

    progress.attempts += 1;

    return await this.userProgressRepo.save(progress);
  }

  /**
   * Get user's public profile
   */
  async getUserPublicProfile(userId: string): Promise<UserPublicProfile | null> {
    return await this.publicProfileRepo.findOne({
      where: { userId },
    });
  }

  /**
   * Validate instance data against schema
   */
  private validateInstanceData(data: Record<string, any>, schema: any): void {
    if (!schema.fields || !Array.isArray(schema.fields)) {
      return; // No validation if schema is invalid
    }

    for (const field of schema.fields) {
      if (field.required && data[field.name] === undefined) {
        throw new Error(`Required field '${field.name}' is missing in instance data`);
      }

      if (data[field.name] !== undefined) {
        // Basic type checking
        const actualType = typeof data[field.name];
        if (field.type === 'array' && !Array.isArray(data[field.name])) {
          throw new Error(`Field '${field.name}' must be an array`);
        }
        if (field.type === 'object' && (actualType !== 'object' || Array.isArray(data[field.name]))) {
          throw new Error(`Field '${field.name}' must be an object`);
        }
        if (['string', 'number', 'boolean'].includes(field.type) && actualType !== field.type) {
          throw new Error(`Field '${field.name}' must be of type ${field.type}`);
        }
      }
    }
  }

  /**
   * Validate user progress custom data against schema
   */
  private validateUserProgressData(data: Record<string, any>, schema: any): void {
    if (!schema.customFields || !Array.isArray(schema.customFields)) {
      return; // No validation if schema is invalid
    }

    for (const field of schema.customFields) {
      if (field.required && data[field.name] === undefined) {
        throw new Error(`Required custom field '${field.name}' is missing in user progress data`);
      }

      if (data[field.name] !== undefined) {
        // Basic type checking
        const actualType = typeof data[field.name];
        if (field.type === 'array' && !Array.isArray(data[field.name])) {
          throw new Error(`Custom field '${field.name}' must be an array`);
        }
        if (field.type === 'object' && (actualType !== 'object' || Array.isArray(data[field.name]))) {
          throw new Error(`Custom field '${field.name}' must be an object`);
        }
        if (['string', 'number', 'boolean'].includes(field.type) && actualType !== field.type) {
          throw new Error(`Custom field '${field.name}' must be of type ${field.type}`);
        }
      }
    }
  }
}

