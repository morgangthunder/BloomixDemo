
export interface Lesson {
  id: number;
  title: string;
  description: string;
  thumbnailUrl: string;
}

export interface Category {
  name: string;
  lessons: Lesson[];
}
