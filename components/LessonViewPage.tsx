
import React, { useState, useMemo } from 'react';
import type { Lesson, Stage } from '../types';
import { HandRaisedIcon, PaperAirplaneIcon, ArrowLeftIcon } from './Icon';
import LessonSidebar from './LessonSidebar';

interface LessonViewPageProps {
  lesson: Lesson;
  onExit: () => void;
}

const LessonViewPage: React.FC<LessonViewPageProps> = ({ lesson, onExit }) => {
  const [lessonStages, setLessonStages] = useState<Stage[]>(lesson.stages || []);
  
  const [activeStageId, setActiveStageId] = useState<number | null>(lesson.stages?.[0]?.id ?? null);
  const [activeSubStageId, setActiveSubStageId] = useState<number | null>(lesson.stages?.[0]?.subStages?.[0]?.id ?? null);

  const activeSubStage = useMemo(() => {
    const stage = lessonStages.find(s => s.id === activeStageId);
    return stage?.subStages.find(ss => ss.id === activeSubStageId);
  }, [activeStageId, activeSubStageId, lessonStages]);

  const handleSelectSubStage = (stageId: number, subStageId: number) => {
    setActiveStageId(stageId);
    setActiveSubStageId(subStageId);
    
    // Mark stage as viewed when a substage is selected
    setLessonStages(prevStages => prevStages.map(stage => 
      stage.id === stageId ? { ...stage, viewed: true } : stage
    ));
  };
  
  const handleTogglePass = (stageId: number) => {
     setLessonStages(prevStages => prevStages.map(stage => {
      if (stage.id === stageId) {
        return { ...stage, passed: !stage.passed };
      }
      return stage;
    }));
  };

  return (
    <div className="flex h-screen bg-brand-dark text-white">
      <LessonSidebar 
        lessonTitle={lesson.title}
        stages={lessonStages}
        activeSubStageId={activeSubStageId}
        onSelectSubStage={handleSelectSubStage}
        onExit={onExit}
      />
      
      <main className="flex-1 flex flex-col h-screen">
        <div className="flex-1 p-6 md:p-8 lg:p-12 overflow-y-auto">
          {activeSubStage ? (
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{activeSubStage.title}</h1>
              <p className="text-brand-gray mb-8">{activeSubStage.type}</p>

              <div className="bg-brand-black rounded-lg aspect-video flex items-center justify-center text-brand-gray">
                <p>Content for "{activeSubStage.title}" would be here.</p>
                {activeSubStage.type === 'Evaluate' && (
                  <button 
                    onClick={() => handleTogglePass(activeStageId!)}
                    className="ml-4 bg-brand-red text-white font-bold py-2 px-4 rounded hover:bg-opacity-80 transition"
                  >
                   Toggle "Passed" Status
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-brand-gray text-xl">Select a lesson stage to begin.</p>
            </div>
          )}
        </div>
        
        <div className="p-4 md:p-6 bg-brand-black border-t border-gray-700">
          <div className="flex items-center space-x-4">
             <button className="flex items-center justify-center bg-gray-700 text-white font-bold py-2 px-4 rounded hover:bg-gray-600 transition">
              <HandRaisedIcon className="h-5 w-5 mr-2" />
              Raise Hand
            </button>
            <div className="flex-1 relative">
              <input 
                type="text"
                placeholder="Ask the AI teacher a question..."
                className="w-full bg-brand-dark border border-gray-600 rounded-lg py-2 pl-4 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-brand-red"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-brand-gray hover:text-white transition-colors">
                 <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LessonViewPage;