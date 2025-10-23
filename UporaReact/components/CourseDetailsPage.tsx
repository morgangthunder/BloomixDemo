import React, { useState } from 'react';
import type { Course, HubLesson } from '../types';
import { ArrowLeftIcon } from './Icon';
import HubLessonCard from './HubLessonCard';

interface CourseDetailsPageProps {
  course: Course;
  lessons: HubLesson[];
  onExit: () => void;
  onEnterBuilder: () => void;
}

const CourseDetailsPage: React.FC<CourseDetailsPageProps> = ({ course, lessons, onExit, onEnterBuilder }) => {
  const [openStatsId, setOpenStatsId] = useState<number | null>(null);

  const handleToggleStats = (id: number) => {
    setOpenStatsId(prevId => (prevId === id ? null : id));
  };

  return (
    <div className="pt-24 min-h-screen container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="mb-12">
             <button onClick={onExit} className="flex items-center text-sm text-brand-gray hover:text-white transition-colors mb-4">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Hub
            </button>
            <h1 className="text-4xl font-bold text-white">{course.title}</h1>
            <p className="text-brand-gray mt-2">{lessons.length} {lessons.length === 1 ? 'Lesson' : 'Lessons'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {lessons.map(lesson => (
                <HubLessonCard 
                    key={lesson.id} 
                    lesson={lesson}
                    onClick={() => lesson.isClickable ? onEnterBuilder() : undefined}
                    onToggleStats={handleToggleStats}
                    isStatsOpen={openStatsId === lesson.id}
                    courseName={undefined} // Don't show course name here
                />
            ))}
             {lessons.length === 0 && (
                <p className="text-brand-gray col-span-full text-center py-8">This course doesn't have any lessons yet.</p>
            )}
        </div>
    </div>
  );
};

export default CourseDetailsPage;