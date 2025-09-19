import React from 'react';
import { CloseIcon } from './Icon';
import type { Course } from '../types';

interface AddToCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (courseId: number) => void;
  courses: Course[];
}

const AddToCourseModal: React.FC<AddToCourseModalProps> = ({ isOpen, onClose, onAssign, courses }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-brand-dark rounded-lg shadow-xl w-full max-w-md flex flex-col p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Add Lesson to Course</h2>
          <button onClick={onClose} className="text-brand-gray hover:text-white transition-colors">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {courses.map(course => (
            <button
              key={course.id}
              onClick={() => onAssign(course.id)}
              className="w-full text-left p-3 bg-brand-black rounded-md hover:bg-gray-800 transition-colors"
            >
              <span className="text-brand-light-gray font-semibold">{course.title}</span>
            </button>
          ))}
           {courses.length === 0 && (
              <p className="text-brand-gray text-center py-4">You don't have any courses to add this lesson to.</p>
           )}
        </div>
      </div>
    </div>
  );
};

export default AddToCourseModal;
