
export interface SubStage {
  id: number;
  type: 'Engage' | 'Explore' | 'Explain' | 'Elaborate' | 'Evaluate';
  title: string;
  content: { type: 'video' | 'text' | 'interactive'; url?: string; text?: string };
  completed: boolean;
}

export interface Stage {
  id: number;
  title: string;
  subStages: SubStage[];
  viewed: boolean;
  passed: boolean;
}


export interface Lesson {
  id: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  stages?: Stage[];
}

export interface Category {
  name: string;
  lessons: Lesson[];
}