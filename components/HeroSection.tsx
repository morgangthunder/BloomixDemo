import React from 'react';
import type { Lesson } from '../types';
import { PlayIcon, InfoIcon, PlusIcon, CheckIcon } from './Icon';

interface HeroSectionProps {
  lesson: Lesson;
  onToggleMyList: (lesson: Lesson) => void;
  isInMyList: boolean;
}

const HeroSection: React.FC<HeroSectionProps> = ({ lesson, onToggleMyList, isInMyList }) => {
  return (
    <div className="relative h-[56.25vw] min-h-[400px] max-h-[800px] w-full">
      {/* Background Image */}
      <div
        className="absolute top-0 left-0 w-full h-full bg-cover bg-center"
        style={{ backgroundImage: `url(${lesson.thumbnailUrl.replace('400/225', '1280/720')})` }}
      ></div>
      {/* Gradient Overlay */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-brand-black via-transparent to-brand-black/50"></div>
       <div className="absolute bottom-0 left-0 w-full h-1/4 bg-gradient-to-t from-brand-black to-transparent"></div>


      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end h-full pb-10 sm:pb-20 lg:pb-32 px-4 sm:px-8 lg:px-16">
        <div className="max-w-xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-white drop-shadow-lg">
            {lesson.title}
          </h2>
          <p className="mt-4 text-sm sm:text-base lg:text-lg text-brand-light-gray max-w-prose drop-shadow-md">
            {lesson.description}
          </p>
          <div className="mt-6 flex items-center space-x-4">
            <button className="flex items-center justify-center bg-white text-black font-bold py-2 px-6 rounded hover:bg-opacity-80 transition">
              <PlayIcon className="h-6 w-6 mr-2" />
              Start Lesson
            </button>
            <button 
              onClick={() => onToggleMyList(lesson)}
              className="flex items-center justify-center bg-gray-500 bg-opacity-70 text-white font-bold py-2 px-6 rounded hover:bg-opacity-50 transition"
            >
              {isInMyList ? <CheckIcon className="h-6 w-6 mr-2" /> : <PlusIcon className="h-6 w-6 mr-2" />}
              {isInMyList ? 'In My List' : 'Add to List'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;