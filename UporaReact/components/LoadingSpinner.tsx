
import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-brand-black bg-opacity-75 flex flex-col items-center justify-center z-50">
      <div className="w-16 h-16 border-4 border-t-brand-red border-gray-600 rounded-full animate-spin"></div>
      <p className="mt-4 text-white text-lg font-semibold">Generating Your Lessons...</p>
    </div>
  );
};

export default LoadingSpinner;
