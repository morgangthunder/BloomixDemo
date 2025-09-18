import React, { useState } from 'react';
import { ArrowLeftIcon, PlusCircleIcon, PencilIcon, TrashIcon, PauseIcon, ChartBarIcon, PaperAirplaneIcon } from './Icon';

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

type LessonStatus = 'Published' | 'Pending Approval' | 'Build In Progress';

const MOCK_LESSONS = [
    { 
        id: 1, title: "The Art of Public Speaking", stageCount: 5, status: 'Build In Progress' as LessonStatus, isClickable: true,
        stats: { views: 0, completionRate: 0, completions: 0 }, earnings: 0.00
    },
    { 
        id: 2, title: "Intro to Astrophysics", stageCount: 4, status: 'Pending Approval' as LessonStatus, isClickable: false,
        stats: { views: 0, completionRate: 0, completions: 0 }, earnings: 0.00
    },
    { 
        id: 3, title: "Mastering Sourdough", stageCount: 7, status: 'Published' as LessonStatus, isClickable: true,
        stats: { views: 12503, completionRate: 82, completions: 10252 }, earnings: 1250.75
    },
     { 
        id: 4, title: "Beginner's Guide to Watercolour", stageCount: 6, status: 'Published' as LessonStatus, isClickable: true,
        stats: { views: 28400, completionRate: 71, completions: 20164 }, earnings: 2145.50
    },
];

const StatusChip: React.FC<{ status: LessonStatus }> = ({ status }) => {
    const colors = {
        'Published': 'bg-green-500/20 text-green-300',
        'Pending Approval': 'bg-yellow-500/20 text-yellow-300',
        'Build In Progress': 'bg-blue-500/20 text-blue-300'
    };
    return (
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${colors[status]}`}>
            {status}
        </span>
    );
}

const LessonCard: React.FC<{ 
    lesson: typeof MOCK_LESSONS[0]; 
    onClick?: () => void;
    onToggleStats: (id: number) => void;
    isStatsOpen: boolean; 
}> = ({ lesson, onClick, onToggleStats, isStatsOpen }) => {
    const cardClasses = `bg-brand-dark rounded-lg border border-gray-800 text-left w-full transition-all group ${lesson.isClickable ? 'hover:border-brand-red' : 'opacity-60'}`;
    
    return (
        <div className={cardClasses}>
            {/* Clickable Area */}
            <div onClick={lesson.isClickable ? onClick : undefined} className={`p-4 ${lesson.isClickable ? 'cursor-pointer' : ''}`}>
                {/* Top Section */}
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold text-white">{lesson.title}</h3>
                        <p className="text-sm text-brand-gray mt-1">{lesson.stageCount} {lesson.stageCount === 1 ? 'Stage' : 'Stages'}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <StatusChip status={lesson.status} />
                        {lesson.isClickable && <PencilIcon className="w-5 h-5 text-brand-gray group-hover:text-white" />}
                    </div>
                </div>
            </div>
            
            {/* Stats Section (collapsible) */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isStatsOpen ? 'max-h-40' : 'max-h-0'}`}>
                {lesson.status === 'Published' && (
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-gray-700 p-4">
                        <div className="text-center md:text-left">
                            <p className="text-xs text-brand-gray">Views</p>
                            <p className="font-semibold text-white">{lesson.stats.views.toLocaleString()}</p>
                        </div>
                        <div className="text-center md:text-left">
                            <p className="text-xs text-brand-gray">Avg. Completion</p>
                            <p className="font-semibold text-white">{lesson.stats.completionRate}%</p>
                        </div>
                        <div className="text-center md:text-left">
                            <p className="text-xs text-brand-gray">Completed</p>
                            <p className="font-semibold text-white">{lesson.stats.completions.toLocaleString()}</p>
                        </div>
                         <div className="text-center md:text-left">
                            <p className="text-xs text-brand-gray">Earnings</p>
                            <p className="font-bold text-green-400">${lesson.earnings.toFixed(2)}</p>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Actions */}
            <div className="flex items-center justify-between border-t border-gray-700 px-4 py-3">
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={() => onToggleStats(lesson.id)}
                        disabled={lesson.status !== 'Published'}
                        className="p-1.5 text-brand-gray hover:text-white hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                        title="Stats"
                    >
                        <ChartBarIcon className="w-5 h-5"/>
                    </button>
                    <button className="p-1.5 text-brand-gray hover:text-white hover:bg-gray-700 rounded-full transition-colors" title="Pause Lesson"><PauseIcon className="w-5 h-5"/></button>
                    <button className="p-1.5 text-brand-gray hover:text-red-500 hover:bg-gray-700 rounded-full transition-colors" title="Delete Lesson"><TrashIcon className="w-5 h-5"/></button>
                </div>
                {lesson.status === 'Build In Progress' && (
                    <button className="flex items-center bg-brand-red/80 text-white font-bold text-sm py-1.5 px-3 rounded hover:bg-brand-red transition-colors">
                        <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                        Submit for Approval
                    </button>
                )}
            </div>
        </div>
    );
};

const LessonBuilderHubPage: React.FC<LessonBuilderHubPageProps> = ({ onExit, onEnterBuilder }) => {
    const [openStatsId, setOpenStatsId] = useState<number | null>(null);

    const handleToggleStats = (id: number) => {
        setOpenStatsId(prevId => (prevId === id ? null : id));
    };

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
                        {MOCK_LESSONS.map(lesson => (
                            <LessonCard 
                                key={lesson.id}
                                lesson={lesson}
                                onClick={() => lesson.id === 1 || lesson.status === 'Published' ? onEnterBuilder() : undefined}
                                onToggleStats={handleToggleStats}
                                isStatsOpen={openStatsId === lesson.id}
                            />
                        ))}
                    </div>
                </section>
            </div>

        </div>
    );
};

export default LessonBuilderHubPage;