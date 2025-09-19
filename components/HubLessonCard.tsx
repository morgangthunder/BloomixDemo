import React from 'react';
import type { HubLesson } from '../types';
import { PencilIcon, TrashIcon, PauseIcon, ChartBarIcon, PaperAirplaneIcon, PlusCircleIcon } from './Icon';
import StatusChip from './StatusChip';

interface HubLessonCardProps {
    lesson: HubLesson;
    onClick?: () => void;
    onToggleStats: (id: number) => void;
    isStatsOpen: boolean;
    onOpenAssignModal?: (lesson: HubLesson) => void;
    courseName?: string | null;
}

const HubLessonCard: React.FC<HubLessonCardProps> = ({ lesson, onClick, onToggleStats, isStatsOpen, onOpenAssignModal, courseName }) => {
    const cardClasses = `bg-brand-dark rounded-lg border border-gray-800 text-left w-full transition-all group ${lesson.isClickable ? 'hover:border-brand-red' : 'opacity-60'}`;

    return (
        <div className={cardClasses}>
            <div onClick={lesson.isClickable ? onClick : undefined} className={`p-4 ${lesson.isClickable ? 'cursor-pointer' : ''}`}>
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold text-white">{lesson.title}</h3>
                        <p className="text-sm text-brand-gray mt-1">{lesson.stageCount} Stages</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <StatusChip status={lesson.status} />
                        {lesson.isClickable && <PencilIcon className="w-5 h-5 text-brand-gray group-hover:text-white" />}
                    </div>
                </div>
                {courseName !== undefined && (
                    <div className="mt-3">
                        <p className="text-sm text-brand-gray">Course: <span className="font-semibold text-brand-light-gray">{courseName || 'None'}</span></p>
                    </div>
                )}
            </div>

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

            <div className="flex items-center justify-between border-t border-gray-700 px-4 py-3">
                <div className="flex items-center space-x-2">
                    <button onClick={() => onToggleStats(lesson.id)} disabled={lesson.status !== 'Published'} className="p-1.5 text-brand-gray hover:text-white hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Stats"><ChartBarIcon className="w-5 h-5" /></button>
                    <button disabled={lesson.status !== 'Published'} className="p-1.5 text-brand-gray hover:text-white hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Pause Lesson"><PauseIcon className="w-5 h-5" /></button>
                    <button className="p-1.5 text-brand-gray hover:text-red-500 hover:bg-gray-700 rounded-full transition-colors" title="Delete Lesson"><TrashIcon className="w-5 h-5" /></button>
                </div>
                {lesson.status === 'Build In Progress' ? (
                     onOpenAssignModal ? (
                         <button onClick={() => onOpenAssignModal(lesson)} className="flex items-center border border-brand-red text-brand-red font-bold text-sm py-1.5 px-3 rounded hover:bg-brand-red/10 transition-colors">
                            <PlusCircleIcon className="w-4 h-4 mr-2" />
                            Add to Course
                        </button>
                     ) : (
                        <button className="flex items-center bg-blue-500/80 text-white font-bold text-sm py-1.5 px-3 rounded hover:bg-blue-500 transition-colors">
                            <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                            Submit for Approval
                        </button>
                     )
                ) : null}
            </div>
        </div>
    );
};

export default HubLessonCard;
