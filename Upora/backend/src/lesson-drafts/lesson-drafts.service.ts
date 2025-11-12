import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LessonDraft } from './entities/lesson-draft.entity';
import { Lesson } from '../entities/lesson.entity';
import { CreateLessonDraftDto } from './dto/create-lesson-draft.dto';
import { ApproveDraftDto } from './dto/approve-draft.dto';

@Injectable()
export class LessonDraftsService {
  constructor(
    @InjectRepository(LessonDraft)
    private lessonDraftRepository: Repository<LessonDraft>,
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
  ) {}

  /**
   * Create or update a draft for a lesson
   * Only one draft per lesson is allowed
   */
  async createOrUpdateDraft(dto: CreateLessonDraftDto): Promise<LessonDraft> {
    // Check if draft already exists for this lesson
    const existingDraft = await this.lessonDraftRepository.findOne({
      where: { lessonId: dto.lessonId }
    });

    if (existingDraft) {
      // Update existing draft
      existingDraft.draftData = dto.draftData;
      existingDraft.changeSummary = dto.changeSummary || existingDraft.changeSummary;
      existingDraft.changesCount = dto.changesCount || existingDraft.changesCount;
      existingDraft.status = 'pending'; // Reset to pending if previously rejected
      existingDraft.updatedAt = new Date();
      
      return await this.lessonDraftRepository.save(existingDraft);
    }

    // Create new draft
    const draft = this.lessonDraftRepository.create(dto);
    return await this.lessonDraftRepository.save(draft);
  }

  /**
   * Get all pending drafts for a tenant
   */
  async getPendingDrafts(tenantId: string): Promise<LessonDraft[]> {
    return await this.lessonDraftRepository.find({
      where: { tenantId, status: 'pending' },
      relations: ['lesson'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get draft for a specific lesson
   */
  async getDraftByLessonId(lessonId: string): Promise<LessonDraft | null> {
    return await this.lessonDraftRepository.findOne({
      where: { lessonId },
      relations: ['lesson']
    });
  }

  /**
   * Generate diff between draft and live lesson
   */
  async generateDiff(draftId: string): Promise<any> {
    const draft = await this.lessonDraftRepository.findOne({
      where: { id: draftId },
      relations: ['lesson']
    });

    if (!draft) {
      throw new NotFoundException('Draft not found');
    }

    const liveLesson = draft.lesson;
    const draftData = draft.draftData;

    // Generate list of changes
    const changes: any[] = [];

    // Compare title
    if (liveLesson.title !== draftData.title) {
      changes.push({
        type: 'title',
        field: 'Title',
        from: liveLesson.title,
        to: draftData.title
      });
    }

    // Compare description
    if (liveLesson.description !== draftData.description) {
      changes.push({
        type: 'description',
        field: 'Description',
        from: liveLesson.description,
        to: draftData.description
      });
    }

    // Compare script blocks
    // Handle both data structures: liveLesson uses data.stages, draft uses structure.stages
    const liveLessonData: any = liveLesson.data || {};
    const liveStages = liveLessonData.stages || liveLessonData.structure?.stages || [];
    const draftStages = draftData.structure?.stages || (draftData as any).stages || [];

    liveStages.forEach((liveStage, stageIdx) => {
      const draftStage = draftStages[stageIdx];
      if (!draftStage) return;

      liveStage.subStages?.forEach((liveSubStage, subIdx) => {
        const draftSubStage = draftStage.subStages?.[subIdx];
        if (!draftSubStage) return;

        // Compare script blocks
        const liveScripts = liveSubStage.scriptBlocks || [];
        const draftScripts = draftSubStage.scriptBlocks || [];

        liveScripts.forEach((liveBlock, blockIdx) => {
          const draftBlock = draftScripts[blockIdx];
          if (!draftBlock) return;

          // Handle both text and content fields
          const liveText = liveBlock.text || liveBlock.content;
          const draftText = draftBlock.text || draftBlock.content;

          if (liveText !== draftText) {
            changes.push({
              type: 'script_text',
              field: `Script Block - ${liveStage.title} > ${liveSubStage.title}`,
              from: liveText,
              to: draftText,
              context: `Block ${blockIdx + 1}`
            });
          }
        });

        // Check for new script blocks
        if (draftScripts.length > liveScripts.length) {
          const newBlocks = draftScripts.slice(liveScripts.length);
          newBlocks.forEach((newBlock, idx) => {
            changes.push({
              type: 'script_added',
              field: `New Script Block - ${liveStage.title} > ${liveSubStage.title}`,
              from: null,
              to: newBlock.text || newBlock.content,
              context: `New block ${liveScripts.length + idx + 1}`
            });
          });
        }

        // Compare interaction
        const liveInteraction = liveSubStage.interaction?.type;
        const draftInteraction = draftSubStage.interaction?.type;
        if (liveInteraction !== draftInteraction) {
          changes.push({
            type: 'interaction_type',
            field: `Interaction - ${liveStage.title} > ${liveSubStage.title}`,
            from: liveInteraction || 'None',
            to: draftInteraction || 'None'
          });
        }
      });
    });

    return {
      draftId: draft.id,
      lessonId: draft.lessonId,
      lessonTitle: liveLesson.title,
      createdBy: draft.accountId,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      changes,
      changesCount: changes.length
    };
  }

  /**
   * Approve a draft and apply changes to live lesson
   */
  async approveDraft(draftId: string, dto: ApproveDraftDto): Promise<Lesson> {
    const draft = await this.lessonDraftRepository.findOne({
      where: { id: draftId },
      relations: ['lesson']
    });

    if (!draft) {
      throw new NotFoundException('Draft not found');
    }

    if (draft.status !== 'pending') {
      throw new ConflictException('Draft has already been reviewed');
    }

    // Apply draft changes to live lesson
    const lesson = draft.lesson;
    lesson.title = draft.draftData.title || lesson.title;
    lesson.description = draft.draftData.description || lesson.description;
    lesson.category = draft.draftData.category || lesson.category;
    lesson.difficulty = draft.draftData.difficulty || lesson.difficulty;
    lesson.durationMinutes = draft.draftData.durationMinutes || lesson.durationMinutes;
    lesson.thumbnailUrl = draft.draftData.thumbnailUrl || lesson.thumbnailUrl;
    lesson.tags = draft.draftData.tags || lesson.tags;
    lesson.data = draft.draftData;

    await this.lessonRepository.save(lesson);

    // Mark draft as approved
    draft.status = 'approved';
    draft.reviewedAt = new Date();
    draft.reviewedBy = dto.reviewedBy;
    await this.lessonDraftRepository.save(draft);

    return lesson;
  }

  /**
   * Reject a draft
   */
  async rejectDraft(draftId: string, dto: ApproveDraftDto): Promise<LessonDraft> {
    const draft = await this.lessonDraftRepository.findOne({
      where: { id: draftId }
    });

    if (!draft) {
      throw new NotFoundException('Draft not found');
    }

    if (draft.status !== 'pending') {
      throw new ConflictException('Draft has already been reviewed');
    }

    draft.status = 'rejected';
    draft.reviewedAt = new Date();
    draft.reviewedBy = dto.reviewedBy;

    return await this.lessonDraftRepository.save(draft);
  }

  /**
   * Delete a draft (can only delete pending or rejected drafts)
   */
  async deleteDraft(draftId: string): Promise<void> {
    const draft = await this.lessonDraftRepository.findOne({
      where: { id: draftId }
    });

    if (!draft) {
      throw new NotFoundException('Draft not found');
    }

    if (draft.status === 'approved') {
      throw new ConflictException('Cannot delete approved draft');
    }

    await this.lessonDraftRepository.remove(draft);
  }
}

