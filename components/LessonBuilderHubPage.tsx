import React from 'react';
import { ArrowLeftIcon, PlusCircleIcon, PencilIcon } from './Icon';

interface LessonBuilderHubPageProps {
    onExit: () => void;
    onEnterBuilder: () => void;
}

const CourseCard: React.FC<{ title: string; lessonCount: number; isClickable?: boolean; onClick?: () => void }> = ({ title, lessonCount, isClickable = false, onClick }) => {
    const cardClasses = `bg-brand-dark p-6 rounded-lg border border-gray-800 text-left w-full ${isClickable ? 'hover:border-brand-red cursor-pointer transition-colors' : 'opacity-50'}`;
    return (
        <button onClick={onClick} disabled={!isClickable} className={cardClasses}>
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <p className="text-brand-gray mt-2">{lessonCount} {lessonCount === 1 ? 'Lesson' : 'Lessons'}</p>
        </button>
    );
};

const LessonCard: React.FC<{ title: string; stageCount: number; isClickable?: boolean; onClick?: () => void }> = ({ title, stageCount, isClickable = false, onClick }) => {
    const cardClasses = `bg-brand-dark p-6 rounded-lg border border-gray-800 text-left w-full ${isClickable ? 'hover:border-brand-red cursor-pointer transition-colors' : 'opacity-50'}`;
    return (
        <button onClick={onClick} disabled={!isClickable} className={cardClasses}>
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                    <p className="text-brand-gray mt-2">{stageCount} {stageCount === 1 ? 'Stage' : 'Stages'}</p>
                </div>
                {isClickable && <PencilIcon className="w-5 h-5 text-brand-gray group-hover:text-white" />}
            </div>
        </button>
    );
};


const LessonBuilderHubPage: React.FC<LessonBuilderHubPageProps> = ({ onExit, onEnterBuilder }) => {
    return (
        <div className="pt-24 min-h-screen container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            <div className="flex items-center justify-between mb-12">
                 <h1 className="text-4xl font-bold text-white">Lesson Builder Hub</h1>
                 <button onClick={onExit} className="flex items-center text-sm text-brand-gray hover:text-white transition-colors">
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Back to Home
                </button>
            </div>
            
            <div className="space-y-12">
                <section>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-semibold text-white">My Courses</h2>
                        <button className="flex items-center text-brand-red font-bold py-2 px-4 rounded hover:bg-brand-red/10 transition-colors">
                            <PlusCircleIcon className="w-5 h-5 mr-2" />
                            New Course
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <CourseCard title="Instructional Design 101" lessonCount={3} />
                        <CourseCard title="Advanced French Grammar" lessonCount={8} />
                    </div>
                </section>
                
                <section>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-semibold text-white">My Lessons</h2>
                        <button className="flex items-center text-brand-red font-bold py-2 px-4 rounded hover:bg-brand-red/10 transition-colors">
                             <PlusCircleIcon className="w-5 h-5 mr-2" />
                            New Lesson
                        </button>
                    </div>
                     <div className="space-y-4">
                        <LessonCard title="The Art of Public Speaking" stageCount={5} isClickable={true} onClick={onEnterBuilder} />
                        <LessonCard title="Intro to Astrophysics" stageCount={4} />
                        <LessonCard title="Mastering Sourdough" stageCount={7} />
                    </div>
                </section>
            </div>

        </div>
    );
};

export default LessonBuilderHubPage;
