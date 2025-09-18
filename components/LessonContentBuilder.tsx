import React from 'react';
import { INTERACTION_TYPES } from '../data/lessonBuilderData';

const LessonContentBuilder: React.FC = () => {

    const uniqueInteractionTypes = [...new Set(INTERACTION_TYPES.map(item => item.name))];

    return (
        <div className="h-full flex flex-col">
            <header className="flex justify-between items-center mb-6">
                 <h1 className="text-3xl font-bold">Lesson Content</h1>
                 <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-brand-gray">Preview Interaction:</span>
                    <select className="bg-brand-dark border border-gray-600 rounded-md p-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-red">
                        <option value="">Select Interaction Type</option>
                        {uniqueInteractionTypes.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>
                 </div>
            </header>
            <main className="flex-1 bg-brand-black rounded-lg border border-gray-700 flex items-center justify-center">
                 <p className="text-brand-gray">View content as applied to selected interaction type here.</p>
            </main>
        </div>
    );
};

export default LessonContentBuilder;
