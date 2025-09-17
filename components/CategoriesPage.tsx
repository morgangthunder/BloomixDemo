
import React from 'react';
import type { Category, Lesson } from '../types';
import CategoryCarousel from './CategoryCarousel';

interface CategoriesPageProps {
  categories: Category[];
  onToggleMyList: (lesson: Lesson) => void;
  isInMyList: (lessonId: number) => boolean;
  onStartLesson: (lesson: Lesson) => void;
}

const CategoriesPage: React.FC<CategoriesPageProps> = ({ categories, onToggleMyList, isInMyList, onStartLesson }) => {
  return (
    <div className="pt-24 min-h-screen">
      <div className="py-4 md:py-8 lg:py-12 space-y-8 md:space-y-12 lg:space-y-16">
        {categories.map((category) => (
          <CategoryCarousel 
            key={category.name} 
            category={category} 
            onToggleMyList={onToggleMyList}
            isInMyList={isInMyList}
            onStartLesson={onStartLesson}
          />
        ))}
      </div>
    </div>
  );
};

export default CategoriesPage;