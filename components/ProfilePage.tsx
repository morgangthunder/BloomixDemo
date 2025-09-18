import React, { useState } from 'react';
import type { Lesson } from '../types';
import { CATEGORIES } from '../data/lessons';
import { AcademicCapIcon, CheckCircleIcon, LinkIcon, LockClosedIcon, ArrowLeftIcon } from './Icon';

const commonInputClasses = "w-full bg-brand-dark border border-gray-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-red";
const commonLabelClasses = "block text-sm font-medium text-brand-gray mb-1";
const commonButtonClasses = "bg-brand-red text-white font-bold py-2 px-4 rounded hover:bg-opacity-80 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed";

// Mock Data
const MOCK_USER = {
    username: 'Alex_Learner',
    email: 'alex.learner@example.com',
    subscription: 'Student: Premium Plan',
};

const SUBSCRIPTION_PLANS = ['Student: Free Plan', 'Student: Premium Plan', 'Lesson-builder', 'Interaction Builder'];


// Mock lesson progress
const MOCK_LESSON_PROGRESS = [
    { id: 9, status: 'completed', passed: true, public: true },
    { id: 1, status: 'completed', passed: true, public: false },
    { id: 2, status: 'in-progress', passed: false, public: false },
    { id: 17, status: 'in-progress', passed: false, public: false },
    { id: 25, status: 'not-started', passed: false, public: false },
];

const lessonsWithProgress = CATEGORIES.flatMap(c => c.lessons).map(lesson => {
    const progress = MOCK_LESSON_PROGRESS.find(p => p.id === lesson.id);
    return { ...lesson, ...(progress || { status: 'not-started', passed: false, public: false }) };
});

const ToggleSwitch: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <label className="relative inline-flex items-center cursor-pointer">
    <input type="checkbox" checked={checked} onChange={onChange} className="sr-only peer" />
    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-red-500/50 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-red"></div>
  </label>
);

interface ProfilePageProps {
    onExit: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onExit }) => {
    const [activeTab, setActiveTab] = useState('all');

    const filteredLessons = lessonsWithProgress.filter(lesson => {
        if (activeTab === 'all') return lesson.status !== 'not-started';
        return lesson.status === activeTab;
    });

    return (
        <div className="pt-24 min-h-screen container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
            <div className="flex items-center justify-between mb-12">
                 <h1 className="text-4xl font-bold text-white">My Profile</h1>
                 <button onClick={onExit} className="flex items-center text-sm text-brand-gray hover:text-white transition-colors">
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Back to Home
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Account Details */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-brand-dark p-6 rounded-lg border border-gray-800">
                        <h2 className="text-2xl font-semibold mb-4">Account Details</h2>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="username" className={commonLabelClasses}>Username</label>
                                <input type="text" id="username" defaultValue={MOCK_USER.username} className={commonInputClasses} />
                            </div>
                            <div>
                                <label htmlFor="email" className={commonLabelClasses}>Email</label>
                                <input type="email" id="email" defaultValue={MOCK_USER.email} className={`${commonInputClasses} bg-gray-800`} readOnly />
                            </div>
                            <button className={commonButtonClasses}>Save Changes</button>
                        </div>
                    </div>
                     <div className="bg-brand-dark p-6 rounded-lg border border-gray-800">
                        <h2 className="text-2xl font-semibold mb-4">Subscription</h2>
                        <div className="space-y-3">
                            {SUBSCRIPTION_PLANS.map(plan => {
                                const isActive = MOCK_USER.subscription === plan;
                                return (
                                    <div key={plan} className={`p-3 rounded-md border transition-colors ${isActive ? 'bg-brand-red/20 border-brand-red' : 'border-gray-700'}`}>
                                        <div className="flex items-center justify-between">
                                            <span className={`font-medium ${isActive ? 'text-white' : 'text-brand-gray'}`}>{plan}</span>
                                            {isActive && <CheckCircleIcon solid className="w-5 h-5 text-brand-red" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <button className={`${commonButtonClasses} w-full mt-6`}>Manage Subscription</button>
                    </div>
                     <div className="bg-brand-dark p-6 rounded-lg border border-gray-800">
                        <h2 className="text-2xl font-semibold mb-4">Security</h2>
                        <div className="space-y-4">
                           <button className={`${commonButtonClasses} w-full flex items-center justify-center`}>
                                <LockClosedIcon className="w-5 h-5 mr-2" />
                                Reset Password
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Learning History */}
                <div className="lg:col-span-2">
                    <div className="bg-brand-dark p-6 rounded-lg border border-gray-800">
                        <h2 className="text-2xl font-semibold mb-4">My Learning History</h2>
                        
                        <div className="border-b border-gray-700 mb-4">
                             <nav className="flex space-x-4">
                                <button onClick={() => setActiveTab('all')} className={`py-2 px-1 border-b-2 font-medium ${activeTab === 'all' ? 'border-brand-red text-white' : 'border-transparent text-brand-gray hover:text-white'}`}>All</button>
                                <button onClick={() => setActiveTab('completed')} className={`py-2 px-1 border-b-2 font-medium ${activeTab === 'completed' ? 'border-brand-red text-white' : 'border-transparent text-brand-gray hover:text-white'}`}>Completed</button>
                                <button onClick={() => setActiveTab('in-progress')} className={`py-2 px-1 border-b-2 font-medium ${activeTab === 'in-progress' ? 'border-brand-red text-white' : 'border-transparent text-brand-gray hover:text-white'}`}>In Progress</button>
                            </nav>
                        </div>

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700">
                            {filteredLessons.map(lesson => (
                                <div key={lesson.id} className="bg-brand-black p-4 rounded-md flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                    <div className="mb-4 sm:mb-0">
                                        <p className="font-bold text-white">{lesson.title}</p>
                                        <div className="flex items-center text-sm text-brand-gray mt-1">
                                            {lesson.status === 'completed' && <CheckCircleIcon solid className="w-5 h-5 text-green-500 mr-2" />}
                                            {lesson.status === 'in-progress' && <div className="w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse"></div>}
                                            <span className="capitalize">{lesson.status.replace('-', ' ')}</span>
                                            {lesson.status === 'completed' && (
                                                <span className="mx-2">|</span>
                                            )}
                                            {lesson.status === 'completed' && (
                                                <span className={`${lesson.passed ? 'text-green-500' : 'text-red-500'}`}>{lesson.passed ? 'Passed' : 'Not Passed'}</span>
                                            )}
                                        </div>
                                    </div>
                                    {lesson.status === 'completed' && (
                                        <div className="flex items-center space-x-4">
                                            <div className="text-right">
                                                <p className="text-sm font-medium">Show on Public Profile</p>
                                                <p className="text-xs text-brand-gray">(Completion & Badge)</p>
                                            </div>
                                            <ToggleSwitch checked={lesson.public} onChange={() => alert('Toggling public visibility')} />
                                             <button title="Get Accreditation" className="text-brand-gray hover:text-brand-red transition-colors">
                                                <AcademicCapIcon className="w-6 h-6" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
