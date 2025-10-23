import React from 'react';
import type { Lesson } from '../types';
import { ArrowLeftIcon, PlayIcon, CheckCircleIcon, PlusIcon, CheckIcon } from './Icon';

interface LessonOverviewPageProps {
  lesson: Lesson;
  onExit: () => void;
  onStartLesson: () => void;
  onToggleMyList: () => void;
  isInMyList: boolean;
}

const LessonOverviewPage: React.FC<LessonOverviewPageProps> = ({ lesson, onExit, onStartLesson, onToggleMyList, isInMyList }) => {
  // Mock data for the overview
  const duration = lesson.stages.reduce((total, stage) => total + stage.subStages.reduce((subTotal, subStage) => subTotal + subStage.duration, 0), 0) || 45;
  const rating = 4.8;
  const ratingCount = "12.5k";
  const instructor = "Dr. Evelyn Reed";
  
  return (
    <div className="min-h-screen bg-brand-black text-white">
      <div className="relative h-[45vh] md:h-[60vh] w-full">
        {/* Background Image */}
        <div
          className="absolute top-0 left-0 w-full h-full bg-cover bg-center"
          style={{ backgroundImage: `url(${lesson.thumbnailUrl.replace('400/225', '1280/720')})` }}
        />
        {/* Gradient Overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-brand-black via-brand-black/50 to-transparent" />
        {/* Back Button */}
        <button onClick={onExit} className="absolute top-6 left-6 z-20 flex items-center text-sm text-white bg-black/30 backdrop-blur-sm p-2 rounded-full hover:bg-black/50 transition-colors">
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back
        </button>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16 -mt-32 md:-mt-48 relative z-10">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-extrabold text-white drop-shadow-lg">
            {lesson.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-brand-light-gray">
            <div className="flex items-center">
              <span className="font-semibold text-yellow-400 mr-1">{rating}</span>
              <span>⭐ ({ratingCount} ratings)</span>
            </div>
            <span>|</span>
            <span>{duration} minutes</span>
             <span>|</span>
            <span>By {instructor}</span>
          </div>

          <p className="mt-6 text-lg text-brand-light-gray max-w-prose">
            {lesson.description}
          </p>
          
          <div className="mt-8 flex items-center space-x-4">
            <button 
              onClick={onStartLesson}
              className="flex items-center justify-center bg-brand-red text-white font-bold py-3 px-8 text-lg rounded-md hover:bg-red-700 transition"
            >
              <PlayIcon className="h-7 w-7 mr-3" />
              Start Lesson
            </button>
            <button 
              onClick={onToggleMyList}
              className="flex items-center justify-center bg-gray-500 bg-opacity-70 text-white font-bold py-3 px-8 text-lg rounded hover:bg-opacity-50 transition"
            >
              {isInMyList ? <CheckIcon className="h-6 w-6 mr-2" /> : <PlusIcon className="h-6 w-6 mr-2" />}
              {isInMyList ? 'In My List' : 'Add to List'}
            </button>
          </div>

          <div className="mt-12 p-6 bg-brand-dark rounded-lg border border-gray-800">
            <h2 className="text-2xl font-bold mb-4">What you'll learn</h2>
            <ul className="space-y-3">
              <li className="flex items-start">
                <CheckCircleIcon className="w-6 h-6 text-green-500 mr-3 mt-1 shrink-0" />
                <span>Master key phrases and cultural nuances to navigate French conversations with confidence.</span>
              </li>
              <li className="flex items-start">
                <CheckCircleIcon className="w-6 h-6 text-green-500 mr-3 mt-1 shrink-0" />
                <span>Learn how to order food and drinks, ask for directions, and handle common travel situations.</span>
              </li>
              <li className="flex items-start">
                <CheckCircleIcon className="w-6 h-6 text-green-500 mr-3 mt-1 shrink-0" />
                <span>Improve your pronunciation and listening skills through interactive exercises and real-life dialogues.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonOverviewPage;