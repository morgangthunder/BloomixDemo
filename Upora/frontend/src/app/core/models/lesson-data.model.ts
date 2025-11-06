// Comprehensive Lesson Data Schema Interfaces

export interface ProcessedContentData {
  id: string;
  name: string;
  type: 'qa_pairs' | 'summary' | 'facts' | 'exercises' | 'quiz' | 'code_examples' | 'interactive_demo' | 'assessment_questions' | 'custom';
  sourceContentId?: string;
  workflowName?: string;
  createdBy: string;
  createdAt: string;
  data: ProcessedContentDataPayload;
  metadata: {
    quality: number;
    confidence: number;
    tags: string[];
    validationStatus: 'valid' | 'invalid' | 'pending';
    validationErrors?: string[];
  };
}

export interface ProcessedContentDataPayload {
  // QA Pairs
  qa_pairs?: {
    questions: Array<{
      id: string;
      question: string;
      answer: string;
      explanation?: string;
      difficulty: 'easy' | 'medium' | 'hard';
      tags: string[];
    }>;
  };

  // Summary
  summary?: {
    text: string;
    keyPoints: string[];
    wordCount: number;
    readingTime: number;
  };

  // Facts
  facts?: {
    items: Array<{
      id: string;
      fact: string;
      source?: string;
      category: string;
      importance: 'low' | 'medium' | 'high';
    }>;
  };

  // Exercises
  exercises?: {
    problems: Array<{
      id: string;
      title: string;
      description: string;
      instructions: string;
      starterCode?: string;
      solution: string;
      testCases: Array<{
        input: any;
        expectedOutput: any;
        description: string;
      }>;
      difficulty: 'beginner' | 'intermediate' | 'advanced';
      estimatedTime: number;
    }>;
  };

  // Quiz
  quiz?: {
    questions: Array<{
      id: string;
      type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'code_completion';
      question: string;
      options?: string[];
      correctAnswer: string | string[];
      explanation: string;
      points: number;
      timeLimit?: number;
    }>;
    totalPoints: number;
    passingScore: number;
  };

  // Code Examples
  code_examples?: {
    examples: Array<{
      id: string;
      title: string;
      description: string;
      language: string;
      code: string;
      explanation: string;
      runnable: boolean;
      dependencies?: string[];
    }>;
  };

  // Interactive Demo
  interactive_demo?: {
    title: string;
    description: string;
    type: 'pixi_interaction' | 'code_editor' | 'simulation';
    config: any;
    assets: string[];
    steps: Array<{
      id: string;
      title: string;
      instructions: string;
      expectedOutcome: string;
    }>;
  };

  // Assessment Questions
  assessment_questions?: {
    questions: Array<{
      id: string;
      type: 'knowledge' | 'application' | 'analysis' | 'synthesis';
      question: string;
      rubric: {
        criteria: Array<{
          description: string;
          points: number;
          examples?: string[];
        }>;
      };
      sampleAnswers?: Array<{
        level: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement';
        answer: string;
        explanation: string;
      }>;
    }>;
  };

  // Custom
  custom?: {
    schema: string;
    data: any;
  };
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

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}


