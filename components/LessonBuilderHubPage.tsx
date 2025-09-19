import React, { useState } from 'react';
import { ArrowLeftIcon, PlusCircleIcon } from './Icon';
import type { Course, HubLesson } from '../types';
import AddToCourseModal from './AddToCourseModal';
import HubCourseCard from './HubCourseCard';
import HubLessonCard from './HubLessonCard';

interface LessonBuilderHubPageProps {
    onExit: () => void;
    onEnterBuilder: () => void;
    courses: Course[];
    lessons: HubLesson[];
    onViewCourse: (course: Course) => void;
    onAssignLesson: (lessonId: number, courseId: number) => void;
}

const LessonBuilderHubPage: React.FC<LessonBuilderHubPageProps> = ({ onExit, onEnterBuilder, courses, lessons, onViewCourse, onAssignLesson }) => {
    const [openCourseStatsId, setOpenCourseStatsId] = useState<number | null>(null);
    const [openLessonStatsId, setOpenLessonStatsId] = useState<number | null>(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [lessonToAssign, setLessonToAssign] = useState<HubLesson | null>(null);

    const handleToggleCourseStats = (id: number) => {
        setOpenCourseStatsId(prevId => (prevId === id ? null : id));
    };

    const handleToggleLessonStats = (id: number) => {
        setOpenLessonStatsId(prevId => (prevId === id ? null : id));
    };

    const handleOpenAssignModal = (lesson: HubLesson) => {
        setLessonToAssign(lesson);
        setIsAssignModalOpen(true);
    };

    const handleCloseAssignModal = () => {
        setLessonToAssign(null);
        setIsAssignModalOpen(false);
    };

    const handleConfirmAssignment = (courseId: number) => {
        if (lessonToAssign) {
            onAssignLesson(lessonToAssign.id, courseId);
        }
        handleCloseAssignModal();
    };

    const unassignedLessons = lessons.filter(l => l.courseId === null);

    return (
        <div className="pt-24 min-h-screen container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            {lessonToAssign && (
                <AddToCourseModal
                    isOpen={isAssignModalOpen}
                    onClose={handleCloseAssignModal}
                    onAssign={handleConfirmAssignment}
                    courses={courses}
                />
            )}
            <div className="mb-12">
                <button onClick={onExit} className="flex items-center text-sm text-brand-gray hover:text-white transition-colors mb-4">
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Back to Home
                </button>
                <h1 className="text-4xl font-bold text-white">Lesson Builder Hub</h1>
            </div>

            <div className="space-y-12">
                <section className="bg-brand-dark p-6 rounded-lg border border-gray-800">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-semibold text-white">My Courses</h2>
                        <button className="flex items-center text-brand-red font-bold py-2 px-4 rounded hover:bg-brand-red/10 transition-colors">
                            <PlusCircleIcon className="w-5 h-5 mr-2" />
                            New Course
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map(course => {
                            const lessonCount = lessons.filter(l => l.courseId === course.id).length;
                            return (
                                <HubCourseCard
                                    key={course.id}
                                    course={course}
                                    lessonCount={lessonCount}
                                    onClick={() => onViewCourse(course)}
                                    onToggleStats={handleToggleCourseStats}
                                    isStatsOpen={openCourseStatsId === course.id}
                                />
                            );
                        })}
                    </div>
                </section>

                <section className="bg-brand-dark p-6 rounded-lg border border-gray-800">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-semibold text-white">My Lessons</h2>
                        <button className="flex items-center text-brand-red font-bold py-2 px-4 rounded hover:bg-brand-red/10 transition-colors">
                            <PlusCircleIcon className="w-5 h-5 mr-2" />
                            New Lesson
                        </button>
                    </div>
                    <div className="space-y-4">
                        {unassignedLessons.map(lesson => (
                            <HubLessonCard
                                key={lesson.id}
                                lesson={lesson}
                                onClick={() => lesson.isClickable ? onEnterBuilder() : undefined}
                                onToggleStats={handleToggleLessonStats}
                                isStatsOpen={openLessonStatsId === lesson.id}
                                onOpenAssignModal={handleOpenAssignModal}
                                courseName={null} // Explicitly null for unassigned
                            />
                        ))}
                        {unassignedLessons.length === 0 && (
                            <p className="text-center text-brand-gray py-8">All lessons are assigned to courses.</p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default LessonBuilderHubPage;
