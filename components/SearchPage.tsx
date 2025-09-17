
import React from 'react';
import type { Lesson } from '../types';
import LessonCard from './LessonCard';

interface SearchPageProps {
  lessons: Lesson[];
  searchQuery: string;
  onToggleMyList: (lesson: Lesson) => void;
  isInMyList: (lessonId: number) => boolean;
}

const SearchPage: React.FC<SearchPageProps> = ({ lessons, searchQuery, onToggleMyList, isInMyList }) => {
  return (
    <div className="pt-24 min-h-screen container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      {searchQuery && (
        <h1 className="text-xl md:text-2xl text-white mb-8">
          Results for: <span className="font-bold">{searchQuery}</span>
        </h1>
      )}

      {lessons.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4">
          {lessons.map((lesson) => (
            <LessonCard 
              key={lesson.id} 
              lesson={lesson} 
              onToggleMyList={onToggleMyList} 
              isInMyList={isInMyList(lesson.id)}
              displayMode="grid"
            />
          ))}
        </div>
      ) : (
        searchQuery && (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center">
            <h2 className="text-xl font-semibold text-white">No results found for "{searchQuery}"</h2>
            <p className="text-brand-gray mt-2">Try searching for something else.</p>
          </div>
        )
      )}
    </div>
  );
};

export default SearchPage;
