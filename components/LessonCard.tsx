
import React from 'react';
import type { Lesson } from '../types';
import { PlayIcon, PlusIcon, CheckIcon } from './Icon';

interface LessonCardProps {
  lesson: Lesson;
  onToggleMyList: (lesson: Lesson) => void;
  isInMyList: boolean;
  onStartLesson: (lesson: Lesson) => void;
  displayMode?: 'carousel' | 'grid';
}

const LessonCard: React.FC<LessonCardProps> = ({ lesson, onToggleMyList, isInMyList, onStartLesson, displayMode = 'carousel' }) => {
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when clicking the button
    onToggleMyList(lesson);
  };
  
  const handleCardClick = () => {
    onStartLesson(lesson);
  }

  const modeClasses = {
    carousel: "flex-shrink-0 w-64 h-36 md:w-72 md:h-40 lg:w-80 lg:h-44",
    grid: "w-full aspect-video"
  };
  
  const baseClasses = "group relative rounded-md overflow-hidden bg-brand-dark cursor-pointer transform transition-all duration-300 ease-in-out hover:scale-105 hover:z-10";

  return (
    <div
      className={`${baseClasses} ${modeClasses[displayMode]}`}
      onClick={handleCardClick}
    >
      <img
        src={lesson.thumbnailUrl}
        alt={lesson.title}
        className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-50"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20"></div>
      <div className="absolute bottom-0 left-0 p-3 w-full">
        <h3 className="text-white font-bold truncate">{lesson.title}</h3>
      </div>
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <PlayIcon className="h-12 w-12 text-white bg-black/50 rounded-full p-2" />
      </div>

      <button
        onClick={handleToggle}
        aria-label={isInMyList ? 'Remove from my list' : 'Add to my list'}
        className="absolute top-2 right-2 z-20 p-1.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white/20"
      >
        {isInMyList 
          ? <CheckIcon className="w-5 h-5 text-white" /> 
          : <PlusIcon className="w-5 h-5 text-white" />
        }
      </button>
    </div>
  );
};

export default LessonCard;