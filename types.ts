import { STAGE_TYPES, SUB_STAGE_TYPES_MAP } from './data/lessonBuilderData';

export type StageType = typeof STAGE_TYPES[number];
export type SubStageType = typeof SUB_STAGE_TYPES_MAP[StageType][number];

export interface ScriptBlock {
  id: number;
  type: 'action' | 'teacherTalk';
  content: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
}

export interface SubStage {
  id: number;
  title: string;
  type: SubStageType;
  interactionType: string;
  duration: number; // in minutes
  script: ScriptBlock[];
  content?: { type: 'video' | 'text' | 'interactive'; url?: string; text?: string };
  completed?: boolean;
}

export interface Stage {
  id: number;
  title: string;
  type: StageType;
  subStages: SubStage[];
  viewed?: boolean;
  passed?: boolean;
}

export interface Lesson {
  id: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  stages: Stage[];
}

export interface Category {
  name: string;
  lessons: Lesson[];
}