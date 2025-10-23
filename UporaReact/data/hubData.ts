import type { Course, HubLesson } from '../types';

export const MOCK_COURSES: Course[] = [
    { 
        id: 1, 
        title: "Instructional Design 101",
        status: 'Published',
        stats: { views: 40903, completionRate: 78, completions: 31904 },
        earnings: 3400.25
    },
    { 
        id: 2, 
        title: "Advanced French Grammar",
        status: 'Pending Approval',
        stats: { views: 0, completionRate: 0, completions: 0 },
        earnings: 0.00
    },
];

export const MOCK_HUB_LESSONS: HubLesson[] = [
    {
        id: 1, title: "The Art of Public Speaking", stageCount: 5, status: 'Build In Progress', isClickable: true,
        stats: { views: 0, completionRate: 0, completions: 0 }, earnings: 0.00, courseId: 1
    },
    {
        id: 2, title: "Intro to Astrophysics", stageCount: 4, status: 'Pending Approval', isClickable: true,
        stats: { views: 0, completionRate: 0, completions: 0 }, earnings: 0.00, courseId: 1
    },
    {
        id: 3, title: "Mastering Sourdough", stageCount: 7, status: 'Published', isClickable: true,
        stats: { views: 12503, completionRate: 82, completions: 10252 }, earnings: 1250.75, courseId: 1
    },
     {
        id: 4, title: "Beginner's Guide to Watercolour", stageCount: 6, status: 'Published', isClickable: true,
        stats: { views: 28400, completionRate: 71, completions: 20164 }, earnings: 2145.50, courseId: 2
    },
    {
        id: 5, title: "The History of Ancient Rome", stageCount: 8, status: 'Build In Progress', isClickable: true,
        stats: { views: 0, completionRate: 0, completions: 0 }, earnings: 0.00, courseId: null
    },
    {
        id: 6, title: "Fundamentals of Digital Marketing", stageCount: 6, status: 'Build In Progress', isClickable: true,
        stats: { views: 0, completionRate: 0, completions: 0 }, earnings: 0.00, courseId: null
    }
];