import React, { useState } from 'react';
import type { Stage } from '../types';
import { ArrowLeftIcon, ChevronDownIcon, ChevronRightIcon, CheckCircleIcon, EyeIcon, CloseIcon } from './Icon';

interface LessonSidebarProps {
  lessonTitle: string;
  stages: Stage[];
  activeSubStageId: number | null;
  onSelectSubStage: (stageId: number, subStageId: number) => void;
  onExit: () => void;
  onCloseMobileNav?: () => void;
}

const StageItem: React.FC<{
  stage: Stage;
  activeSubStageId: number | null;
  onSelectSubStage: (stageId: number, subStageId: number) => void;
}> = ({ stage, activeSubStageId, onSelectSubStage }) => {
  const [isExpanded, setIsExpanded] = useState(stage.viewed);

  return (
    <div>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left p-3 hover:bg-gray-700 rounded-md transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center">
            {isExpanded ? <ChevronDownIcon className="w-4 h-4 mr-2"/> : <ChevronRightIcon className="w-4 h-4 mr-2"/>}
            <span className="font-semibold">{stage.title}</span>
        </div>
        <div className="flex items-center space-x-2">
            {stage.viewed && <EyeIcon className="w-5 h-5 text-blue-400" title="Viewed" />}
            <CheckCircleIcon solid={stage.passed} className={`w-5 h-5 ${stage.passed ? 'text-green-500' : 'text-gray-500'}`} title={stage.passed ? 'Passed' : 'Not Passed'} />
        </div>
      </button>
      {isExpanded && (
        <ul className="pl-6 border-l-2 border-gray-600 ml-3.5 my-2">
          {stage.subStages.map(subStage => (
            <li key={subStage.id}>
              <a 
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onSelectSubStage(stage.id, subStage.id);
                }}
                className={`block p-2 rounded-md transition-colors text-sm ${
                  activeSubStageId === subStage.id 
                    ? 'bg-brand-red text-white font-bold' 
                    : 'text-brand-light-gray hover:bg-gray-700'
                }`}
              >
                {subStage.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};


const LessonSidebar: React.FC<LessonSidebarProps> = ({ lessonTitle, stages, activeSubStageId, onSelectSubStage, onExit, onCloseMobileNav }) => {
  return (
    <aside className="w-full h-full bg-brand-black flex flex-col p-4 border-r border-gray-700">
      <div className="flex-shrink-0 pb-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <button onClick={onExit} className="flex items-center text-sm text-brand-gray hover:text-white transition-colors">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Back to Home
          </button>
          {onCloseMobileNav && (
            <button onClick={onCloseMobileNav} className="p-1 text-brand-gray hover:text-white md:hidden">
              <CloseIcon className="w-5 h-5" />
            </button>
          )}
        </div>
        <h2 className="text-xl font-bold truncate" title={lessonTitle}>{lessonTitle}</h2>
      </div>
      <nav className="flex-1 overflow-y-auto mt-4 space-y-2">
        {stages.map(stage => (
          <StageItem 
            key={stage.id}
            stage={stage}
            activeSubStageId={activeSubStageId}
            onSelectSubStage={onSelectSubStage}
          />
        ))}
      </nav>
    </aside>
  );
};

export default LessonSidebar;
