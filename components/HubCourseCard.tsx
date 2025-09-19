import React from 'react';
import type { Course } from '../types';
import { PencilIcon, TrashIcon, PauseIcon, ChartBarIcon } from './Icon';
import StatusChip from './StatusChip';

interface HubCourseCardProps {
    course: Course;
    lessonCount: number;
    onClick: () => void;
    onToggleStats: (id: number) => void;
    isStatsOpen: boolean;
}

const HubCourseCard: React.FC<HubCourseCardProps> = ({ course, lessonCount, onClick, onToggleStats, isStatsOpen }) => {
    const cardClasses = `bg-brand-dark rounded-lg border border-gray-800 text-left w-full transition-all group hover:border-brand-red`;

    return (
        <div className={cardClasses}>
            <div onClick={onClick} className="p-4 cursor-pointer">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-white">{course.title}</h3>
                        <p className="text-sm text-brand-gray mt-1">{lessonCount} {lessonCount === 1 ? 'Lesson' : 'Lessons'}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <StatusChip status={course.status} />
                        <PencilIcon className="w-5 h-5 text-brand-gray group-hover:text-white" />
                    </div>
                </div>
            </div>

            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isStatsOpen ? 'max-h-40' : 'max-h-0'}`}>
                {course.status === 'Published' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-gray-700 p-4">
                        <div className="text-center md:text-left">
                            <p className="text-xs text-brand-gray">Views</p>
                            <p className="font-semibold text-white">{course.stats.views.toLocaleString()}</p>
                        </div>
                        <div className="text-center md:text-left">
                            <p className="text-xs text-brand-gray">Avg. Completion</p>
                            <p className="font-semibold text-white">{course.stats.completionRate}%</p>
                        </div>
                        <div className="text-center md:text-left">
                            <p className="text-xs text-brand-gray">Completed</p>
                            <p className="font-semibold text-white">{course.stats.completions.toLocaleString()}</p>
                        </div>
                        <div className="text-center md:text-left">
                            <p className="text-xs text-brand-gray">Earnings</p>
                            <p className="font-bold text-green-400">${course.earnings.toFixed(2)}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-start border-t border-gray-700 px-4 py-3">
                <div className="flex items-center space-x-2">
                    <button onClick={() => onToggleStats(course.id)} disabled={course.status !== 'Published'} className="p-1.5 text-brand-gray hover:text-white hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Stats"><ChartBarIcon className="w-5 h-5" /></button>
                    <button disabled={course.status !== 'Published'} className="p-1.5 text-brand-gray hover:text-white hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Pause Course"><PauseIcon className="w-5 h-5" /></button>
                    <button className="p-1.5 text-brand-gray hover:text-red-500 hover:bg-gray-700 rounded-full transition-colors" title="Delete Course"><TrashIcon className="w-5 h-5" /></button>
                </div>
            </div>
        </div>
    );
};

export default HubCourseCard;
