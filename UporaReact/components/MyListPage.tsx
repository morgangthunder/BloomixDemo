import React from 'react';
import type { Lesson, Category } from '../types';
import CategoryCarousel from './CategoryCarousel';

interface MyListPageProps {
  lessons: Lesson[];
  onToggleMyList: (lesson: Lesson) => void;
  isInMyList: (lessonId: number) => boolean;
  onViewLesson: (lesson: Lesson) => void;
}

const MyListPage: React.FC<MyListPageProps> = ({ lessons, onToggleMyList, isInMyList, onViewLesson }) => {
  const myListCategory: Category = {
    name: 'My List',
    lessons: lessons,
  };

  return (
    <div className="pt-24 min-h-screen">
      {lessons.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <h1 className="text-3xl font-bold text-white mb-4">Your list is empty</h1>
          <p className="text-brand-gray">Add lessons to your list to see them here.</p>
        </div>
      ) : (
        <CategoryCarousel category={myListCategory} onToggleMyList={onToggleMyList} isInMyList={isInMyList} onViewLesson={onViewLesson} />
      )}
    </div>
  );
};

export default MyListPage;