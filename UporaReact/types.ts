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
  contentOutputId?: number;
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

export interface ContentOutput {
  id: number;
  name: string;
  processType: string;
  source: {
      name: string;
      type: 'file' | 'link';
  };
  data: any; // Can be Q&A pairs, summaries, etc.
}

export type ItemStatus = 'Published' | 'Pending Approval' | 'Build In Progress';

export interface Course {
  id: number;
  title: string;
  status: ItemStatus;
  stats: {
    views: number;
    completionRate: number;
    completions: number;
  };
  earnings: number;
}

export interface HubLesson {
  id: number;
  title: string;
  stageCount: number;
  status: ItemStatus;
  isClickable: boolean;
  stats: {
    views: number;
    completionRate: number;
    completions: number;
  };
  earnings: number;
  courseId: number | null;
}