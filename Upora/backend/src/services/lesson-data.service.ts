import { Injectable } from '@nestjs/common';
import { Lesson } from '../entities/lesson.entity';

export interface ProcessedContentData {
  id: string;
  name: string;
  type: 'qa_pairs' | 'summary' | 'facts' | 'exercises' | 'quiz' | 'code_examples' | 'interactive_demo' | 'assessment_questions' | 'custom';
  sourceContentId?: string;
  workflowName?: string;
  createdBy: string;
  createdAt: string;
  data: any;
  metadata: {
    quality: number;
    confidence: number;
    tags: string[];
    validationStatus: 'valid' | 'invalid' | 'pending';
    validationErrors?: string[];
  };
  [key: string]: any; // Index signature for TypeORM compatibility
}

export interface ContentSourceReference {
  id: string;
  type: 'url' | 'file' | 'text' | 'pdf' | 'image' | 'video' | 'audio';
  title: string;
  sourceUrl?: string;
  filePath?: string;
  summary: string;
  weaviateId?: string;
  relevanceScore?: number;
  metadata: {
    topics: string[];
    keywords: string[];
    difficulty: string;
    language: string;
  };
  [key: string]: any; // Index signature for TypeORM compatibility
}

export interface MediaAssetReference {
  id: string;
  type: 'audio' | 'video' | 'image' | 'animation';
  title: string;
  url: string;
  duration?: number;
  size?: number;
  format: string;
  metadata: {
    description: string;
    altText?: string;
    captions?: string;
    transcript?: string;
  };
  [key: string]: any; // Index signature for TypeORM compatibility
}

export interface Stage {
  id: string;
  title: string;
  type: 'trigger' | 'explore' | 'absorb' | 'cultivate' | 'hone';
  description: string;
  duration: number;
  order: number;
  subStages: SubStage[];
  aiPrompt?: string;
  prerequisites?: string[];
  [key: string]: any; // Index signature for TypeORM compatibility
}

export interface SubStage {
  id: string;
  title: string;
  type: string;
  duration: number;
  order: number;
  interactionType: string;
  contentOutputId?: string;
  scriptBlocks: ScriptBlock[];
  aiPrompt?: string;
  prerequisites?: string[];
  metadata: {
    learningObjectives: string[];
    keyPoints: string[];
    difficulty: 'easy' | 'medium' | 'hard';
  };
  [key: string]: any; // Index signature for TypeORM compatibility
}

export interface ScriptBlock {
  id: string;
  type: 'teacher_talk' | 'load_interaction' | 'pause' | 'ai_response' | 'user_input';
  content: string;
  startTime: number;
  endTime: number;
  duration: number;
  order: number;
  metadata: {
    speaker?: 'teacher' | 'ai' | 'student';
    interactionId?: string;
    aiPrompt?: string;
    expectedResponse?: string;
  };
  [key: string]: any; // Index signature for TypeORM compatibility
}

export interface LessonDataSchema {
  metadata: {
    version: string;
    created: string;
    updated: string;
    lessonId: string;
    tenantId: string;
    createdBy: string;
  };
  config: {
    title: string;
    description: string;
    category: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    durationMinutes: number;
    thumbnailUrl?: string;
    tags: string[];
    status: 'draft' | 'pending' | 'approved' | 'rejected';
  };
  aiContext: {
    generalPrompt: string;
    defaultSubStagePrompts: { [key: string]: string };
    customPrompts: { [key: string]: string };
    contextData: {
      lessonObjectives: string[];
      prerequisites: string[];
      keyConcepts: string[];
    };
  };
  structure: {
    stages: Stage[];
    totalDuration: number;
    learningObjectives: string[];
  };
  contentReferences: {
    contentSources: ContentSourceReference[];
    mediaAssets: MediaAssetReference[];
  };
  processedContent: {
    [contentId: string]: ProcessedContentData;
  };
  interactions: {
    interactionTypes: any[];
    customInteractions: any[];
  };
  script: {
    blocks: ScriptBlock[];
    totalDuration: number;
    timing: any;
  };
  assessment: {
    checkpoints: any[];
    evaluationCriteria: any[];
    progressTracking: any;
  };
}

@Injectable()
export class LessonDataService {
  
  /**
   * Create a new lesson with the comprehensive schema
   */
  createNewLesson(tenantId: string, createdBy: string, title: string): LessonDataSchema {
    const now = new Date().toISOString();
    const lessonId = this.generateId();
    
    return {
      metadata: {
        version: '1.0',
        created: now,
        updated: now,
        lessonId,
        tenantId,
        createdBy,
      },
      config: {
        title,
        description: '',
        category: '',
        difficulty: 'Beginner',
        durationMinutes: 0,
        thumbnailUrl: undefined,
        tags: [],
        status: 'draft',
      },
      aiContext: {
        generalPrompt: 'You are an expert teacher. Help students learn through clear explanations and interactive examples.',
        defaultSubStagePrompts: {
          introduction: 'Introduce the concept clearly and provide context.',
          example: 'Show a practical example with step-by-step explanation.',
          practice: 'Guide the student through hands-on practice.',
          assessment: 'Evaluate the student\'s understanding and provide feedback.',
        },
        customPrompts: {},
        contextData: {
          lessonObjectives: [],
          prerequisites: [],
          keyConcepts: [],
        },
      },
      structure: {
        stages: [],
        totalDuration: 0,
        learningObjectives: [],
      },
      contentReferences: {
        contentSources: [],
        mediaAssets: [],
      },
      processedContent: {},
      interactions: {
        interactionTypes: [],
        customInteractions: [],
      },
      script: {
        blocks: [],
        totalDuration: 0,
        timing: {
          autoAdvance: false,
          pauseBetweenStages: 5,
          allowBacktracking: true,
          timeLimit: undefined,
          warnings: {
            timeRemaining: [15, 5],
            messages: ['15 minutes remaining', '5 minutes remaining'],
          },
        },
      },
      assessment: {
        checkpoints: [],
        evaluationCriteria: [],
        progressTracking: {
          trackTime: true,
          trackInteractions: true,
          trackAssessments: true,
          milestones: [],
        },
      },
    };
  }

  /**
   * Add processed content to a lesson
   */
  addProcessedContent(
    lessonData: LessonDataSchema,
    content: ProcessedContentData
  ): LessonDataSchema {
    return {
      ...lessonData,
      processedContent: {
        ...lessonData.processedContent,
        [content.id]: content,
      },
    };
  }

  /**
   * Add content source reference to a lesson
   */
  addContentSourceReference(
    lessonData: LessonDataSchema,
    contentSource: ContentSourceReference
  ): LessonDataSchema {
    return {
      ...lessonData,
      contentReferences: {
        ...lessonData.contentReferences,
        contentSources: [
          ...lessonData.contentReferences.contentSources,
          contentSource,
        ],
      },
    };
  }

  /**
   * Add media asset reference to a lesson
   */
  addMediaAssetReference(
    lessonData: LessonDataSchema,
    mediaAsset: MediaAssetReference
  ): LessonDataSchema {
    return {
      ...lessonData,
      contentReferences: {
        ...lessonData.contentReferences,
        mediaAssets: [
          ...lessonData.contentReferences.mediaAssets,
          mediaAsset,
        ],
      },
    };
  }

  /**
   * Add a stage to the lesson structure
   */
  addStage(
    lessonData: LessonDataSchema,
    stage: any
  ): LessonDataSchema {
    const newStage: any = {
      ...stage,
      id: this.generateId(),
    };

    return {
      ...lessonData,
      structure: {
        ...lessonData.structure,
        stages: [...lessonData.structure.stages, newStage],
      },
    };
  }

  /**
   * Add a substage to a specific stage
   */
  addSubStage(
    lessonData: LessonDataSchema,
    stageId: string,
    subStage: any
  ): LessonDataSchema {
    const newSubStage: any = {
      ...subStage,
      id: this.generateId(),
    };

    return {
      ...lessonData,
      structure: {
        ...lessonData.structure,
        stages: lessonData.structure.stages.map(stage =>
          stage.id === stageId
            ? { ...stage, subStages: [...(stage.subStages || []), newSubStage] }
            : stage
        ),
      },
    };
  }

  /**
   * Add a script block to a substage
   */
  addScriptBlock(
    lessonData: LessonDataSchema,
    subStageId: string,
    scriptBlock: any
  ): LessonDataSchema {
    const newScriptBlock: any = {
      ...scriptBlock,
      id: this.generateId(),
    };

    return {
      ...lessonData,
      structure: {
        ...lessonData.structure,
        stages: lessonData.structure.stages.map(stage => ({
          ...stage,
          subStages: stage.subStages.map(subStage =>
            subStage.id === subStageId
              ? { ...subStage, scriptBlocks: [...subStage.scriptBlocks, newScriptBlock] }
              : subStage
          ),
        })),
      },
    };
  }

  /**
   * Update lesson metadata
   */
  updateLessonMetadata(
    lessonData: LessonDataSchema,
    updates: Partial<LessonDataSchema['config']>
  ): LessonDataSchema {
    return {
      ...lessonData,
      config: {
        ...lessonData.config,
        ...updates,
      },
      metadata: {
        ...lessonData.metadata,
        updated: new Date().toISOString(),
      },
    };
  }

  /**
   * Update AI context
   */
  updateAIContext(
    lessonData: LessonDataSchema,
    updates: Partial<LessonDataSchema['aiContext']>
  ): LessonDataSchema {
    return {
      ...lessonData,
      aiContext: {
        ...lessonData.aiContext,
        ...updates,
      },
      metadata: {
        ...lessonData.metadata,
        updated: new Date().toISOString(),
      },
    };
  }

  /**
   * Validate processed content against interaction type
   */
  validateContentForInteraction(
    content: ProcessedContentData,
    interactionType: string
  ): { isValid: boolean; errors: string[] } {
    // This would be implemented based on the interaction type validation rules
    // For now, return a basic validation
    const errors: string[] = [];
    
    if (!content.data) {
      errors.push('Content data is required');
    }
    
    if (!content.metadata.validationStatus || content.metadata.validationStatus === 'invalid') {
      errors.push('Content validation failed');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get all processed content of a specific type
   */
  getProcessedContentByType(
    lessonData: LessonDataSchema,
    type: ProcessedContentData['type']
  ): ProcessedContentData[] {
    return Object.values(lessonData.processedContent).filter(
      content => content.type === type
    );
  }

  /**
   * Calculate total lesson duration
   */
  calculateTotalDuration(lessonData: LessonDataSchema): number {
    return lessonData.structure.stages.reduce(
      (total, stage) => total + stage.duration,
      0
    );
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

