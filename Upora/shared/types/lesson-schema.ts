/**
 * Lesson Data Schema
 * 
 * This schema defines all fields that make up a lesson.
 * When adding new fields, update this schema and the tests will ensure
 * they're properly tracked in the draft system.
 */

export interface LessonMetadata {
  title: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  thumbnailUrl?: string;
  tags?: string[];
  durationMinutes?: number;
}

export interface LessonObjectives {
  learningObjectives: string[];
  lessonOutcomes?: Array<{ title: string; description?: string }>;
}

export interface ScriptBlock {
  id: string;
  text: string;
  idealTimestamp: number;
  estimatedDuration: number;
  playbackRules?: any;
}

export interface InteractionConfig {
  id?: string;
  type: string;
  name?: string;
  category?: string;
  contentOutputId?: string | number | null;
  config?: any; // Deep comparison - all fields in config are tracked
}

export interface SubStage {
  id: string;
  title: string;
  type: string;
  duration: number;
  scriptBlocks: ScriptBlock[];
  scriptBlocksAfterInteraction?: ScriptBlock[];
  contentOutputId?: string | number | null;
  interactionType?: string | null;
  interaction?: InteractionConfig | null;
}

export interface Stage {
  id: string;
  title: string;
  type: string;
  subStages: SubStage[];
}

export interface LessonStructure {
  stages: Stage[];
}

export interface LessonData {
  metadata: LessonMetadata;
  objectives: LessonObjectives;
  structure: LessonStructure;
}

/**
 * Get all top-level fields that should be in draftData
 */
export function getExpectedDraftDataFields(): string[] {
  return [
    'title',
    'description',
    'category',
    'difficulty',
    'durationMinutes',
    'thumbnailUrl',
    'tags',
    'objectives',
    'structure'
  ];
}

/**
 * Get all fields that should be in a stage object
 */
export function getExpectedStageFields(): string[] {
  return [
    'id',
    'title',
    'type',
    'subStages'
  ];
}

/**
 * Get all fields that should be in a substage object
 */
export function getExpectedSubStageFields(): string[] {
  return [
    'id',
    'title',
    'type',
    'duration',
    'scriptBlocks',
    'scriptBlocksAfterInteraction',
    'contentOutputId',
    'interactionType',
    'interaction'
  ];
}

/**
 * Get all fields that should be in an interaction object
 */
export function getExpectedInteractionFields(): string[] {
  return [
    'id',
    'type',
    'name',
    'category',
    'contentOutputId',
    'config'
  ];
}

/**
 * Get all fields that should be in objectives
 */
export function getExpectedObjectivesFields(): string[] {
  return [
    'learningObjectives',
    'lessonOutcomes'
  ];
}









