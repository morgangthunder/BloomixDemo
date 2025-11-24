import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LessonDraft } from './entities/lesson-draft.entity';
import { Lesson } from '../entities/lesson.entity';
import { ContentSource } from '../entities/content-source.entity';
import { LessonDataLink } from '../entities/lesson-data-link.entity';
import { CreateLessonDraftDto } from './dto/create-lesson-draft.dto';
import { ApproveDraftDto } from './dto/approve-draft.dto';

@Injectable()
export class LessonDraftsService {
  constructor(
    @InjectRepository(LessonDraft)
    private lessonDraftRepository: Repository<LessonDraft>,
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
    @InjectRepository(ContentSource)
    private contentSourceRepository: Repository<ContentSource>,
    @InjectRepository(LessonDataLink)
    private lessonDataLinkRepository: Repository<LessonDataLink>,
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
   * Categorizes changes by type for better organization
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

    // Check if this is a new lesson (no live lesson exists or lessonId doesn't match)
    const isNewLesson = !liveLesson || !liveLesson.id || (draft.lessonId && !liveLesson.id);

    // Generate list of changes grouped by category
    const changes: any[] = [];
    const changeCategories = new Set<string>();

    // NEW LESSON
    if (isNewLesson) {
      changes.push({
        category: 'new_lesson',
        type: 'new_lesson',
        field: 'New Lesson',
        from: null,
        to: draftData.title || 'Untitled Lesson',
        description: `New lesson "${draftData.title || 'Untitled'}" has been created`
      });
      changeCategories.add('new_lesson');
    } else {
      // METADATA CHANGES
      if (liveLesson.title !== draftData.title) {
        changes.push({
          category: 'metadata',
          type: 'title',
          field: 'Title',
          from: liveLesson.title || '(blank)',
          to: draftData.title || '(blank)',
          description: `Title changed from "${liveLesson.title || '(blank)'}" to "${draftData.title || '(blank)'}"`
        });
        changeCategories.add('metadata');
      }

      if (liveLesson.description !== draftData.description) {
        changes.push({
          category: 'metadata',
          type: 'description',
          field: 'Description',
          from: liveLesson.description || '(blank)',
          to: draftData.description || '(blank)',
          description: `Description changed from "${liveLesson.description || '(blank)'}" to "${draftData.description || '(blank)'}"`
        });
        changeCategories.add('metadata');
      }

      // STRUCTURE CHANGES
      const liveLessonData: any = liveLesson.data || {};
      const liveStages = liveLessonData.stages || liveLessonData.structure?.stages || [];
      const draftStages = draftData.structure?.stages || (draftData as any).stages || [];

      // Check for stage/structure changes
      if (liveStages.length !== draftStages.length) {
        changes.push({
          category: 'structure',
          type: 'stages_count',
          field: 'Stages',
          from: `${liveStages.length} stage${liveStages.length === 1 ? '' : 's'}`,
          to: `${draftStages.length} stage${draftStages.length === 1 ? '' : 's'}`,
          description: `Number of stages changed from ${liveStages.length} to ${draftStages.length}`
        });
        changeCategories.add('structure');
      }

      // Check for new stages (in draft but not in live)
      if (draftStages.length > liveStages.length) {
        const newStages = draftStages.slice(liveStages.length);
        newStages.forEach((newStage, idx) => {
          changes.push({
            category: 'structure',
            type: 'stage_added',
            field: `Stage: ${newStage.title || `Stage ${liveStages.length + idx + 1}`}`,
            from: null,
            to: newStage.title || `Stage ${liveStages.length + idx + 1}`,
            description: `New stage "${newStage.title || `Stage ${liveStages.length + idx + 1}`}" added`
          });
          changeCategories.add('structure');
        });
      }

      // Compare each stage and substage
      // Check for removed stages (in live but not in draft)
      liveStages.forEach((liveStage, stageIdx) => {
        const draftStage = draftStages[stageIdx];
        if (!draftStage) {
          changes.push({
            category: 'structure',
            type: 'stage_removed',
            field: `Stage: ${liveStage.title || `Stage ${stageIdx + 1}`}`,
            from: liveStage.title || `Stage ${stageIdx + 1}`,
            to: null,
            description: `Stage "${liveStage.title || `Stage ${stageIdx + 1}`}" was removed`
          });
          changeCategories.add('structure');
          return;
        }

        // Compare stage type
        if (liveStage.type !== draftStage.type) {
          changes.push({
            category: 'structure',
            type: 'stage_type',
            field: `Stage: ${liveStage.title || `Stage ${stageIdx + 1}`}`,
            from: liveStage.type || '(no type)',
            to: draftStage.type || '(no type)',
            description: `Stage type changed from "${liveStage.type || '(no type)'}" to "${draftStage.type || '(no type)'}"`
          });
          changeCategories.add('structure');
        }

        // Compare substages
        const liveSubStages = liveStage.subStages || [];
        const draftSubStages = draftStage.subStages || [];

        // Check for new substages (in draft but not in live)
        if (draftSubStages.length > liveSubStages.length) {
          const newSubStages = draftSubStages.slice(liveSubStages.length);
          newSubStages.forEach((newSubStage, idx) => {
            changes.push({
              category: 'structure',
              type: 'substage_added',
              field: `${liveStage.title || `Stage ${stageIdx + 1}`} > ${newSubStage.title || `Substage ${liveSubStages.length + idx + 1}`}`,
              from: null,
              to: newSubStage.title || `Substage ${liveSubStages.length + idx + 1}`,
              description: `New substage "${newSubStage.title || `Substage ${liveSubStages.length + idx + 1}`}" added to "${liveStage.title || `Stage ${stageIdx + 1}`}"`
            });
            changeCategories.add('structure');
          });
        }

        // Check for removed substages (in live but not in draft)
        liveSubStages.forEach((liveSubStage, subIdx) => {
          const draftSubStage = draftSubStages[subIdx];
          if (!draftSubStage) {
            changes.push({
              category: 'structure',
              type: 'substage_removed',
              field: `${liveStage.title || `Stage ${stageIdx + 1}`} > ${liveSubStage.title || `Substage ${subIdx + 1}`}`,
              from: liveSubStage.title || `Substage ${subIdx + 1}`,
              to: null,
              description: `Substage "${liveSubStage.title || `Substage ${subIdx + 1}`}" was removed from "${liveStage.title || `Stage ${stageIdx + 1}`}"`
            });
            changeCategories.add('structure');
            return;
          }

          // Compare substage type
          if (liveSubStage.type !== draftSubStage.type) {
            changes.push({
              category: 'structure',
              type: 'substage_type',
              field: `${liveStage.title || `Stage ${stageIdx + 1}`} > ${liveSubStage.title || `Substage ${subIdx + 1}`}`,
              from: liveSubStage.type || '(no type)',
              to: draftSubStage.type || '(no type)',
              description: `Substage type changed from "${liveSubStage.type || '(no type)'}" to "${draftSubStage.type || '(no type)'}"`
            });
            changeCategories.add('structure');
          }

          // SCRIPT CHANGES
          const liveScripts = liveSubStage.scriptBlocks || [];
          const draftScripts = draftSubStage.scriptBlocks || [];

          liveScripts.forEach((liveBlock, blockIdx) => {
            const draftBlock = draftScripts[blockIdx];
            if (!draftBlock) return;

            const liveText = liveBlock.text || liveBlock.content || '';
            const draftText = draftBlock.text || draftBlock.content || '';

            if (liveText !== draftText) {
              changes.push({
                category: 'script',
                type: 'script_text',
                field: `${liveStage.title || `Stage ${stageIdx + 1}`} > ${liveSubStage.title || `Substage ${subIdx + 1}`}`,
                from: liveText || '(blank)',
                to: draftText || '(blank)',
                description: `Script block ${blockIdx + 1} in "${liveSubStage.title || `Substage ${subIdx + 1}`}" changed`,
                context: `Block ${blockIdx + 1}`
              });
              changeCategories.add('script');
            }
          });

          // Check for new script blocks
          if (draftScripts.length > liveScripts.length) {
            const newBlocks = draftScripts.slice(liveScripts.length);
            newBlocks.forEach((newBlock, idx) => {
              changes.push({
                category: 'script',
                type: 'script_added',
                field: `${liveStage.title || `Stage ${stageIdx + 1}`} > ${liveSubStage.title || `Substage ${subIdx + 1}`}`,
                from: null,
                to: newBlock.text || newBlock.content || '',
                description: `New script block added to "${liveSubStage.title || `Substage ${subIdx + 1}`}"`,
                context: `New block ${liveScripts.length + idx + 1}`
              });
              changeCategories.add('script');
            });
          }

          // INTERACTION CHANGES
          const liveInteraction = liveSubStage.interaction;
          const draftInteraction = draftSubStage.interaction;

          // Compare interaction type
          const liveInteractionType = liveInteraction?.type;
          const draftInteractionType = draftInteraction?.type;
          if (liveInteractionType !== draftInteractionType) {
            changes.push({
              category: 'interaction',
              type: 'interaction_type',
              field: `${liveStage.title || `Stage ${stageIdx + 1}`} > ${liveSubStage.title || `Substage ${subIdx + 1}`}`,
              from: liveInteractionType || 'None',
              to: draftInteractionType || 'None',
              description: `Interaction type changed from "${liveInteractionType || 'None'}" to "${draftInteractionType || 'None'}"`
            });
            changeCategories.add('interaction');
          }

          // Compare interaction config (for iframe and other configurable interactions)
          if (liveInteraction && draftInteraction) {
            const liveConfig = liveInteraction.config || {};
            const draftConfig = draftInteraction.config || {};

            // Check for iframe guide document
            if (liveConfig.iframeGuideDocUrl !== draftConfig.iframeGuideDocUrl) {
              const fromDoc = liveConfig.iframeGuideDocFileName || liveConfig.iframeGuideDocUrl || '(blank)';
              const toDoc = draftConfig.iframeGuideDocFileName || draftConfig.iframeGuideDocUrl || '(blank)';
              changes.push({
                category: 'interaction_config',
                type: 'iframe_guide_doc',
                field: `${liveStage.title || `Stage ${stageIdx + 1}`} > ${liveSubStage.title || `Substage ${subIdx + 1}`}`,
                from: fromDoc,
                to: toDoc,
                description: `iFrame Guide Doc changed from "${fromDoc}" to "${toDoc}"`,
                fileUrl: draftConfig.iframeGuideDocUrl || null
              });
              changeCategories.add('interaction_config');
            }

            // Check for iframe guide webpage URL
            if (liveConfig.iframeGuideWebpageUrl !== draftConfig.iframeGuideWebpageUrl) {
              changes.push({
                category: 'interaction_config',
                type: 'iframe_guide_webpage',
                field: `${liveStage.title || `Stage ${stageIdx + 1}`} > ${liveSubStage.title || `Substage ${subIdx + 1}`}`,
                from: liveConfig.iframeGuideWebpageUrl || '(blank)',
                to: draftConfig.iframeGuideWebpageUrl || '(blank)',
                description: `iFrame Guide Webpage URL changed from "${liveConfig.iframeGuideWebpageUrl || '(blank)'}" to "${draftConfig.iframeGuideWebpageUrl || '(blank)'}"`
              });
              changeCategories.add('interaction_config');
            }

            // Check for other config changes (generic comparison)
            const configKeys = new Set([...Object.keys(liveConfig), ...Object.keys(draftConfig)]);
            configKeys.forEach(key => {
              // Skip already handled keys
              if (key === 'iframeGuideDocUrl' || key === 'iframeGuideDocFileName' || key === 'iframeGuideWebpageUrl') {
                return;
              }

              if (JSON.stringify(liveConfig[key]) !== JSON.stringify(draftConfig[key])) {
                changes.push({
                  category: 'interaction_config',
                  type: 'config_change',
                  field: `${liveStage.title || `Stage ${stageIdx + 1}`} > ${liveSubStage.title || `Substage ${subIdx + 1}`}`,
                  from: liveConfig[key] !== undefined ? String(liveConfig[key]) : '(blank)',
                  to: draftConfig[key] !== undefined ? String(draftConfig[key]) : '(blank)',
                  description: `Config "${key}" changed from "${liveConfig[key] !== undefined ? String(liveConfig[key]) : '(blank)'}" to "${draftConfig[key] !== undefined ? String(draftConfig[key]) : '(blank)'}"`,
                  configKey: key
                });
                changeCategories.add('interaction_config');
              }
            });
          }
        });
      });
    }

    // CONTENT SUBMISSION CHANGES
    // Compare content sources from lesson data and database links
    const liveLessonData: any = liveLesson?.data || {};
    const liveContentSources = liveLessonData.contentReferences?.contentSources || [];
    const draftContentSources = draftData.contentReferences?.contentSources || [];

    // Get actual content sources from database for live lesson
    let liveDbContentSources: ContentSource[] = [];
    if (!isNewLesson && liveLesson?.id) {
      const liveLinks = await this.lessonDataLinkRepository.find({
        where: { lessonId: liveLesson.id },
        relations: ['contentSource']
      });
      liveDbContentSources = liveLinks.map(link => link.contentSource).filter(cs => cs !== null) as ContentSource[];
    }

    // Compare content sources by ID
    const liveContentSourceIds = new Set([
      ...liveContentSources.map((cs: any) => cs.id),
      ...liveDbContentSources.map(cs => cs.id)
    ]);
    const draftContentSourceIds = new Set(draftContentSources.map((cs: any) => cs.id));

    // Find new content sources
    draftContentSourceIds.forEach(draftId => {
      if (!liveContentSourceIds.has(draftId)) {
        const draftSource = draftContentSources.find((cs: any) => cs.id === draftId);
        if (draftSource) {
          const sourceType = this.getContentSourceTypeLabel(draftSource.type);
          changes.push({
            category: 'content_submission',
            type: 'content_added',
            field: sourceType,
            from: null,
            to: draftSource.title || draftSource.sourceUrl || draftSource.filePath || 'Untitled',
            description: `New ${sourceType} added: "${draftSource.title || draftSource.sourceUrl || draftSource.filePath || 'Untitled'}"`,
            contentSourceId: draftId,
            contentSourceType: draftSource.type,
            contentSourceUrl: draftSource.sourceUrl || draftSource.filePath || null
          });
          changeCategories.add('content_submission');
        }
      }
    });

    // Find removed content sources
    liveContentSourceIds.forEach(liveId => {
      if (!draftContentSourceIds.has(liveId)) {
        const liveSource = liveContentSources.find((cs: any) => cs.id === liveId) || 
                          liveDbContentSources.find(cs => cs.id === liveId);
        if (liveSource) {
          const sourceType = this.getContentSourceTypeLabel(liveSource.type || (liveSource as any).type);
          changes.push({
            category: 'content_submission',
            type: 'content_removed',
            field: sourceType,
            from: liveSource.title || (liveSource as any).sourceUrl || (liveSource as any).filePath || 'Untitled',
            to: null,
            description: `${sourceType} removed: "${liveSource.title || (liveSource as any).sourceUrl || (liveSource as any).filePath || 'Untitled'}"`,
            contentSourceId: liveId
          });
          changeCategories.add('content_submission');
        }
      }
    });

    // Find changed content sources (title, URL, etc.)
    draftContentSourceIds.forEach(draftId => {
      if (liveContentSourceIds.has(draftId)) {
        const draftSource = draftContentSources.find((cs: any) => cs.id === draftId);
        const liveSource = liveContentSources.find((cs: any) => cs.id === draftId) || 
                          liveDbContentSources.find(cs => cs.id === draftId);
        
        if (draftSource && liveSource) {
          const sourceType = this.getContentSourceTypeLabel(draftSource.type);
          
          // Check title change
          if ((liveSource.title || (liveSource as any).title) !== draftSource.title) {
            changes.push({
              category: 'content_submission',
              type: 'content_updated',
              field: `${sourceType}: ${draftSource.title || 'Untitled'}`,
              from: liveSource.title || (liveSource as any).title || '(blank)',
              to: draftSource.title || '(blank)',
              description: `${sourceType} title changed from "${liveSource.title || (liveSource as any).title || '(blank)'}" to "${draftSource.title || '(blank)'}"`,
              contentSourceId: draftId
            });
            changeCategories.add('content_submission');
          }

          // Check URL/source change
          const liveUrl = (liveSource as any).sourceUrl || (liveSource as any).filePath || '';
          const draftUrl = draftSource.sourceUrl || draftSource.filePath || '';
          if (liveUrl !== draftUrl) {
            changes.push({
              category: 'content_submission',
              type: 'content_updated',
              field: `${sourceType}: ${draftSource.title || 'Untitled'}`,
              from: liveUrl || '(blank)',
              to: draftUrl || '(blank)',
              description: `${sourceType} URL/source changed from "${liveUrl || '(blank)'}" to "${draftUrl || '(blank)'}"`,
              contentSourceId: draftId,
              contentSourceUrl: draftUrl || null
            });
            changeCategories.add('content_submission');
          }
        }
      }
    });

    return {
      draftId: draft.id,
      lessonId: draft.lessonId,
      lessonTitle: isNewLesson ? (draftData.title || 'New Lesson') : liveLesson.title,
      createdBy: draft.accountId,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      changes,
      changesCount: changes.length,
      changeCategories: Array.from(changeCategories)
    };
  }

  private getContentSourceTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'url': 'URL',
      'youtube': 'YouTube URL',
      'video': 'Video URL',
      'file': 'File',
      'pdf': 'PDF Document',
      'document': 'Document',
      'doc': 'Document',
      'text': 'Text',
      'image': 'Image',
      'audio': 'Audio',
      'guide_url': 'Guide URL',
      'guide_doc': 'Guide Document',
      'iframe_guide_webpage': 'iFrame Guide Webpage',
      'iframe_guide_doc': 'iFrame Guide Doc'
    };
    return labels[type] || type.toUpperCase();
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

