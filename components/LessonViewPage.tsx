import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import type { Lesson, Stage } from '../types';
import { HandRaisedIcon, PaperAirplaneIcon, GripVerticalIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from './Icon';
import LessonSidebar from './LessonSidebar';

interface LessonViewPageProps {
  lesson: Lesson;
  onExit: () => void;
}

const LessonViewPage: React.FC<LessonViewPageProps> = ({ lesson, onExit }) => {
  const [lessonStages, setLessonStages] = useState<Stage[]>(lesson.stages || []);
  
  const [activeStageId, setActiveStageId] = useState<number | null>(lesson.stages?.[0]?.id ?? null);
  const [activeSubStageId, setActiveSubStageId] = useState<number | null>(lesson.stages?.[0]?.subStages?.[0]?.id ?? null);

  // Sidebar resizing and collapsing state
  const [navWidth, setNavWidth] = useState(384);
  const navWidthBeforeCollapse = useRef(384);
  const isResizing = useRef(false);
  const minNavWidth = 280;
  const maxNavWidth = 600;

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

  const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
  };

  const handleMouseUp = useCallback(() => {
      isResizing.current = false;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
      if (isResizing.current) {
          const newWidth = e.clientX;
          if (newWidth >= minNavWidth && newWidth <= maxNavWidth) {
              setNavWidth(newWidth);
          }
      }
  }, [minNavWidth, maxNavWidth]);

  useEffect(() => {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [handleMouseMove, handleMouseUp]);
  
  const toggleNavCollapse = () => {
    setNavWidth(currentWidth => {
      if (currentWidth > 0) {
        navWidthBeforeCollapse.current = currentWidth;
        return 0;
      } else {
        return navWidthBeforeCollapse.current;
      }
    });
  };

  const isNavCollapsed = navWidth === 0;

  return (
    <div className="flex h-screen bg-brand-dark text-white overflow-hidden">
      <aside 
        style={{ width: `${navWidth}px` }}
        className="h-screen flex-shrink-0 bg-brand-black flex flex-col transition-all duration-300 ease-in-out"
      >
        { !isNavCollapsed && (
          <LessonSidebar 
            lessonTitle={lesson.title}
            stages={lessonStages}
            activeSubStageId={activeSubStageId}
            onSelectSubStage={handleSelectSubStage}
            onExit={onExit}
          />
        )}
      </aside>

      <div 
          onMouseDown={handleMouseDown}
          className="w-2 h-full bg-gray-900 hover:bg-brand-red cursor-col-resize flex items-center justify-center relative group"
      >
          <GripVerticalIcon className="w-5 h-5 text-gray-600" />
          <button 
            onClick={toggleNavCollapse}
            className="absolute z-10 left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 bg-gray-700 hover:bg-brand-red text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            title={isNavCollapsed ? "Expand" : "Collapse"}
          >
            {isNavCollapsed ? <ChevronDoubleRightIcon className="w-4 h-4" /> : <ChevronDoubleLeftIcon className="w-4 h-4" />}
          </button>
      </div>
      
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
                className="w-full bg-brand-dark border border-gray-600 rounded-lg py-2 pl-4 pr-12 text-white placeholder-brand-gray focus:outline-none"
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
