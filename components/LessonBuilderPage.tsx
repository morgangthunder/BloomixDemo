import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import type { Lesson, Stage, SubStage, StageType, SubStageType } from '../types';
import { SAMPLE_LESSON } from '../data/lessonBuilderData';
import LessonBuilderNav from './LessonBuilderNav';
import ItemConfiguration from './ItemConfiguration';
import LessonScriptView from './LessonScriptView';
import ChangeInteractionTypeModal from './ChangeInteractionTypeModal';
import AddItemModal from './AddItemModal';
import ConfirmationModal from './ConfirmationModal';
import { PaperAirplaneIcon, GripVerticalIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from './Icon';
import ContentProcessingNav from './ContentProcessingNav';
import LessonContentBuilder from './LessonContentBuilder';


export type SelectedItem = 
  | { type: 'lesson'; id: number }
  | { type: 'stage'; id: number }
  | { type: 'substage'; id: number; stageId: number };

interface LessonBuilderPageProps {
  onExit: () => void;
}

const LessonBuilderPage: React.FC<LessonBuilderPageProps> = ({ onExit }) => {
  const [lesson, setLesson] = useState<Lesson>(SAMPLE_LESSON);
  const [selectedItem, setSelectedItem] = useState<SelectedItem>({ type: 'lesson', id: lesson.id });
  const [currentBuilderView, setCurrentBuilderView] = useState<'builder' | 'content'>('builder');
  const [isScriptViewVisible, setIsScriptViewVisible] = useState(false);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [activeInput, setActiveInput] = useState<string | null>(null);
  
  // Modals state
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [addItemConfig, setAddItemConfig] = useState<{ mode: 'stage' | 'substage', stageId?: number, stageType?: StageType } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SelectedItem | null>(null);

  // Sidebar resizing and collapsing state
  const [navWidth, setNavWidth] = useState(384);
  const navWidthBeforeCollapse = useRef(384);
  const isResizing = useRef(false);
  const minNavWidth = 280;
  const maxNavWidth = 600;

  const handleSelectItem = (item: SelectedItem) => {
    setSelectedItem(item);
    setActiveInput(null); // Clear focused input on new selection
    if(item.type !== 'substage') {
        setIsScriptViewVisible(false);
    }
  };
  
  const selectionDetails = useMemo(() => {
    if (!selectedItem) return { item: null, parentStageType: undefined };
    switch (selectedItem.type) {
      case 'lesson':
        return { item: lesson, parentStageType: undefined };
      case 'stage':
        return { item: lesson.stages.find(s => s.id === selectedItem.id) || null, parentStageType: undefined };
      case 'substage': {
        const stage = lesson.stages.find(s => s.id === selectedItem.stageId);
        const subStage = stage?.subStages.find(ss => ss.id === selectedItem.id) || null;
        return { item: subStage, parentStageType: stage?.type };
      }
      default:
        return { item: null, parentStageType: undefined };
    }
  }, [selectedItem, lesson]);

  const updateLessonData = (updatedData: Partial<Lesson | Stage | SubStage>) => {
    if (!selectedItem) return;

    setLesson(prevLesson => {
      const newLesson = { ...prevLesson };
      if (selectedItem.type === 'lesson') {
        return { ...newLesson, ...updatedData };
      }
      
      newLesson.stages = newLesson.stages.map(stage => {
        if (selectedItem.type === 'stage' && stage.id === selectedItem.id) {
          return { ...stage, ...(updatedData as Partial<Stage>) };
        }
        if (selectedItem.type === 'substage' && stage.id === selectedItem.stageId) {
          const newSubStages = stage.subStages.map(substage => 
            substage.id === selectedItem.id ? { ...substage, ...(updatedData as Partial<SubStage>) } : substage
          );
          return { ...stage, subStages: newSubStages };
        }
        return stage;
      });
      return newLesson;
    });
  };

  const handleOpenAddItemModal = (mode: 'stage' | 'substage', stageId?: number) => {
    if (mode === 'substage' && stageId) {
      const stage = lesson.stages.find(s => s.id === stageId);
      if (stage) {
        setAddItemConfig({ mode: 'substage', stageId, stageType: stage.type });
        setIsAddItemModalOpen(true);
      }
    } else {
      setAddItemConfig({ mode: 'stage' });
      setIsAddItemModalOpen(true);
    }
  };

  const handleConfirmAddItem = (data: { title: string; type: StageType | SubStageType; duration?: number }) => {
    setLesson(prevLesson => {
      const newLesson = { ...prevLesson };
      if (addItemConfig?.mode === 'stage') {
        const newStage: Stage = { id: Date.now(), title: data.title, type: data.type as StageType, subStages: [] };
        newLesson.stages = [...newLesson.stages, newStage];
      } else if (addItemConfig?.mode === 'substage' && addItemConfig.stageId) {
        newLesson.stages = newLesson.stages.map(stage => {
          if (stage.id === addItemConfig.stageId) {
            const newSubStage: SubStage = { id: Date.now(), title: data.title, type: data.type as SubStageType, duration: data.duration || 5, interactionType: 'None', script: [] };
            return { ...stage, subStages: [...stage.subStages, newSubStage] };
          }
          return stage;
        });
      }
      return newLesson;
    });
    setIsAddItemModalOpen(false);
  };

  const handleOpenDeleteModal = (item: SelectedItem) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    setLesson(prevLesson => {
        const newLesson = { ...prevLesson };
        if (itemToDelete.type === 'stage') {
            newLesson.stages = newLesson.stages.filter(s => s.id !== itemToDelete.id);
        } else if (itemToDelete.type === 'substage') {
            newLesson.stages = newLesson.stages.map(s => {
                if (s.id === itemToDelete.stageId) {
                    s.subStages = s.subStages.filter(ss => ss.id !== itemToDelete.id);
                }
                return s;
            });
        }
        return newLesson;
    });

    if (itemToDelete.type === 'substage') {
        setSelectedItem({ type: 'stage', id: itemToDelete.stageId });
    } else {
        setSelectedItem({ type: 'lesson', id: lesson.id });
    }
    
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  };

  // FIX: Updated handleReorderSubStage to accept 3 arguments to match the prop type in child components.
  // The reordering logic now defaults to inserting 'before' the drop target, which is consistent with the UI feedback.
  const handleReorderSubStage = (stageId: number, draggedId: number, dropTargetId: number) => {
    setLesson(prevLesson => {
        const newLesson = { ...prevLesson };
        const stageIndex = newLesson.stages.findIndex(s => s.id === stageId);
        if (stageIndex === -1) return prevLesson;

        const stage = { ...newLesson.stages[stageIndex] };
        const subStages = [...stage.subStages];

        const draggedIndex = subStages.findIndex(ss => ss.id === draggedId);
        if (draggedIndex === -1) return prevLesson;
        
        const [draggedItem] = subStages.splice(draggedIndex, 1);
        
        const dropTargetIndex = subStages.findIndex(ss => ss.id === dropTargetId);
        if (dropTargetIndex === -1) { // Should not happen if dropping on an item
            subStages.push(draggedItem);
        } else {
            subStages.splice(dropTargetIndex, 0, draggedItem);
        }

        stage.subStages = subStages;
        newLesson.stages[stageIndex] = stage;

        return newLesson;
    });
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

  const handleInteractionTypeChange = (newType: string) => {
    if(selectedItem?.type === 'substage') {
        updateLessonData({ interactionType: newType });
    }
    setIsInteractionModalOpen(false);
  }

  const selectedItemData = selectionDetails.item;
  const isNavCollapsed = navWidth === 0;

  return (
    <div className="flex h-screen bg-brand-dark text-white font-sans overflow-hidden">
       <ChangeInteractionTypeModal 
         isOpen={isInteractionModalOpen}
         onClose={() => setIsInteractionModalOpen(false)}
         onSelect={handleInteractionTypeChange}
         currentStageType={selectionDetails.parentStageType}
         currentSubStageType={(selectedItemData as SubStage)?.type}
       />
       <AddItemModal 
         isOpen={isAddItemModalOpen}
         onClose={() => setIsAddItemModalOpen(false)}
         onAdd={handleConfirmAddItem}
         config={addItemConfig}
       />
       <ConfirmationModal
         isOpen={isDeleteModalOpen}
         onClose={() => setIsDeleteModalOpen(false)}
         onConfirm={handleConfirmDelete}
         title={`Delete ${itemToDelete?.type || 'item'}`}
         message={`Are you sure you want to permanently delete this ${itemToDelete?.type}? This action cannot be undone.`}
       />

      <aside 
        style={{ width: `${navWidth}px` }}
        className="h-screen flex-shrink-0 bg-brand-black flex flex-col transition-all duration-300 ease-in-out"
      >
        { !isNavCollapsed && (
            currentBuilderView === 'builder' ? (
                isScriptViewVisible ? (
                    <LessonScriptView 
                    subStage={selectedItemData as SubStage}
                    onBack={() => setIsScriptViewVisible(false)}
                    />
                ) : (
                    <LessonBuilderNav 
                    lesson={lesson}
                    selectedItem={selectedItem}
                    onSelectItem={handleSelectItem}
                    onShowScript={() => setIsScriptViewVisible(true)}
                    onAddStage={() => handleOpenAddItemModal('stage')}
                    onAddSubStage={(stageId) => handleOpenAddItemModal('substage', stageId)}
                    onDelete={handleOpenDeleteModal}
                    onReorderSubStage={handleReorderSubStage}
                    onExit={onExit}
                    onToggleCollapse={toggleNavCollapse}
                    />
                )
            ) : (
                <ContentProcessingNav 
                    onExit={onExit}
                    onToggleCollapse={toggleNavCollapse}
                />
            )
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
      
      <div className="flex-1 flex flex-col h-screen">
        <main className="flex-1 p-6 md:p-8 lg:p-12 overflow-y-auto">
            {currentBuilderView === 'builder' ? (
                selectedItemData ? (
                    <ItemConfiguration 
                        item={selectedItemData}
                        itemType={selectedItem.type}
                        parentStageType={selectionDetails.parentStageType}
                        onUpdate={updateLessonData}
                        onOpenInteractionModal={() => setIsInteractionModalOpen(true)}
                        onDelete={() => handleOpenDeleteModal(selectedItem)}
                        activeInput={activeInput}
                        setActiveInput={setActiveInput}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-brand-gray text-xl">Select an item from the left to configure it.</p>
                    </div>
                )
            ) : (
                <LessonContentBuilder />
            )}
        </main>
        
        <footer className="p-4 md:p-6 bg-brand-black border-t border-gray-700">
          <div className="flex items-center space-x-4">
             <div className="flex-1 relative">
              <input 
                type="text"
                placeholder="Ask AI for help with the selected item..."
                className="w-full bg-brand-dark border border-gray-600 rounded-lg py-2 pl-4 pr-12 text-white placeholder-brand-gray focus:outline-none focus:ring-0"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-brand-gray hover:text-white transition-colors">
                 <PaperAirplaneIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center bg-brand-dark rounded-md p-1">
                <button 
                    onClick={() => setCurrentBuilderView('builder')}
                    className={`px-4 py-1 text-sm font-semibold rounded-md transition-colors ${currentBuilderView === 'builder' ? 'bg-brand-red text-white' : 'text-brand-gray hover:bg-gray-700'}`}
                >
                    Lesson Builder
                </button>
                <button 
                    onClick={() => setCurrentBuilderView('content')}
                    className={`px-4 py-1 text-sm font-semibold rounded-md transition-colors ${currentBuilderView === 'content' ? 'bg-brand-red text-white' : 'text-brand-gray hover:bg-gray-700'}`}
                >
                    Lesson Content
                </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LessonBuilderPage;