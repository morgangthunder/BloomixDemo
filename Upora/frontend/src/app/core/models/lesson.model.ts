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
  id: string; // UUID string ID from backend
  title: string;
  description: string;
  thumbnailUrl?: string; // Optional for backward compatibility
  image?: string; // Alternative thumbnail property
  category?: string; // Lesson category
  rating?: number; // Average rating
  duration?: string; // Duration string (e.g., "45 min")
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  tags?: string[]; // Tags for the lesson
  views?: number; // View count
  stages?: Stage[]; // Optional for listing views
  status?: 'pending' | 'approved' | 'rejected'; // Approval status from backend
  data?: { stages?: any[] }; // Lesson content data (JSONB from backend)
  completionRate?: string | number; // From backend
  completions?: number; // From backend
  durationMinutes?: number; // From backend
  createdAt?: string; // From backend
  updatedAt?: string; // From backend
  createdBy?: string; // From backend
  realId?: string; // Real UUID from backend API (for navigation)
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
  courseId: number | null; // Legacy numeric ID
  realId?: string; // Real UUID from backend
  realCourseId?: string | null; // Real course UUID from backend
}

// Stage and SubStage types
export const STAGE_TYPES = ['Trigger', 'Explore', 'Absorb', 'Cultivate', 'Hone'] as const;
export type StageType = typeof STAGE_TYPES[number];

export const SUB_STAGE_TYPES_MAP: Record<StageType, readonly string[]> = {
  Trigger: ['Tease', 'Ignite', 'Evoke'], // TIE
  Explore: ['Handle', 'Uncover', 'Noodle', 'Track'], // HUNT
  Absorb: ['Show', 'Interpret', 'Parallel'], // SIP
  Cultivate: ['Grip', 'Repurpose', 'Originate', 'Work'], // GROW
  Hone: ['Verify', 'Evaluate', 'Target'], // VET
};

export type SubStageType = typeof SUB_STAGE_TYPES_MAP[StageType][number];

export type SelectedItem = 
  | { type: 'lesson'; id: string }
  | { type: 'stage'; id: string }
  | { type: 'substage'; id: string; stageId: string };
