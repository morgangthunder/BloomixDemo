
import React from 'react';
import type { Category, Lesson } from '../types';
import LessonCard from './LessonCard';

interface CategoryCarouselProps {
  category: Category;
  onToggleMyList: (lesson: Lesson) => void;
  isInMyList: (lessonId: number) => boolean;
  onStartLesson: (lesson: Lesson) => void;
}

const CategoryCarousel: React.FC<CategoryCarouselProps> = ({ category, onToggleMyList, isInMyList, onStartLesson }) => {
  return (
    <section className="pl-4 sm:pl-8 lg:pl-16">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-4">{category.name}</h2>
      <div className="relative">
        <div className="flex overflow-x-auto overflow-y-hidden space-x-4 pb-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {category.lessons.map((lesson) => (
            <LessonCard 
              key={lesson.id} 
              lesson={lesson} 
              onToggleMyList={onToggleMyList} 
              isInMyList={isInMyList(lesson.id)}
              onStartLesson={onStartLesson}
            />
          ))}
           <div className="flex-shrink-0 w-4 sm:w-8 lg:w-16 h-1"></div>
        </div>
      </div>
    </section>
  );
};

// Simple polyfill for browsers that don't support scrollbar-* classes
const style = document.createElement('style');
style.textContent = `
  .scrollbar-thin::-webkit-scrollbar {
    height: 8px;
  }
  .scrollbar-thumb-gray-700::-webkit-scrollbar-thumb {
    background-color: #374151;
    border-radius: 4px;
  }
  .scrollbar-track-transparent::-webkit-scrollbar-track {
    background: transparent;
  }
`;
document.head.append(style);


export default CategoryCarousel;