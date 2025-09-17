import React from 'react';

const LessonBuilderPage: React.FC = () => {
  return (
    <div className="pt-24 min-h-screen container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Lesson Builder</h1>
        <p className="text-lg text-brand-gray max-w-2xl">
          Welcome to the Lesson Builder! This is where you'll be able to create, customize, and manage your own educational lessons. This feature is currently under construction.
        </p>
      </div>
    </div>
  );
};

export default LessonBuilderPage;
