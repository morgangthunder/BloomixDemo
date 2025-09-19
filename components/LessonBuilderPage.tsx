import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import type { Lesson, Stage, SubStage, StageType, SubStageType } from '../types';
import { SAMPLE_LESSON, MOCK_CONTENT_OUTPUTS } from '../data/lessonBuilderData';
import LessonBuilderNav from './LessonBuilderNav';
import ItemConfiguration from './ItemConfiguration';
import LessonScriptView from './LessonScriptView';
import ChangeInteractionTypeModal from './ChangeInteractionTypeModal';
import AddItemModal from './AddItemModal';
import ConfirmationModal from './ConfirmationModal';
import { PaperAirplaneIcon, GripVerticalIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, MenuIcon, CloseIcon } from './Icon';
import ContentProcessingNav from './ContentProcessingNav';
import LessonContentBuilder from './LessonContentBuilder';
import SelectContentOutputModal from './SelectContentOutputModal';


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
  const [currentBuilderView, setCurrentBuilderView] = useState<'builder' | 'substageContent'>('builder');
  const [isScriptViewVisible, setIsScriptViewVisible] = useState(false);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [activeInput, setActiveInput] = useState<string | null>(null);
  
  // Modals state
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [addItemConfig, setAddItemConfig] = useState<{ mode: 'stage' | 'substage', stageId?: number, stageType?: StageType } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SelectedItem | null>(null);

  // Snackbar State
  const [snackbar, setSnackbar] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const snackbarTimeoutRef = useRef<number | null>(null);

  // Sidebar state
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [navWidth, setNavWidth] = useState(384);
  const navWidthBeforeCollapse = useRef(384);
  const isResizing = useRef(false);
  const minNavWidth = 280;
  const maxNavWidth = 600;
  
  const showSnackbar = (message: string) => {
      if (snackbarTimeoutRef.current) {
          clearTimeout(snackbarTimeoutRef.current);
      }
      setSnackbar({ message, visible: true });
      snackbarTimeoutRef.current = window.setTimeout(() => {
          setSnackbar({ message: '', visible: false });
      }, 3000);
  };


  const handleSelectItem = (item: SelectedItem) => {
    setSelectedItem(item);
    setActiveInput(null); // Clear focused input on new selection
    setIsMobileNavOpen(false); // Close mobile nav on selection
    if(item.type !== 'substage') {
        setIsScriptViewVisible(false);
        // If user selects something other than a substage, switch back to builder view
        setCurrentBuilderView('builder');
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

  const handleReorderStage = (draggedId: number, dropTargetId: number) => {
    setLesson(prevLesson => {
      const stages = [...prevLesson.stages];
      const draggedIndex = stages.findIndex(s => s.id === draggedId);
      const dropTargetIndex = stages.findIndex(s => s.id === dropTargetId);

      if (draggedIndex === -1 || dropTargetIndex === -1) return prevLesson;

      const [draggedItem] = stages.splice(draggedIndex, 1);
      stages.splice(dropTargetIndex, 0, draggedItem);

      return { ...prevLesson, stages };
    });
  };

  const handleReorderSubStage = (stageId: number, draggedId: number, dropTargetId: number) => {
    setLesson(prevLesson => {
        const newLesson = { ...prevLesson };
        const stageIndex = newLesson.stages.findIndex(s => s.id === stageId);
        if (stageIndex === -1) return prevLesson;

        const stage = { ...newLesson.stages[stageIndex] };
        const subStages = [...stage.subStages];

        const draggedIndex = subStages.findIndex(ss => ss.id === draggedId);
        const dropTargetIndex = subStages.findIndex(ss => ss.id === dropTargetId);

        if (draggedIndex === -1 || dropTargetIndex === -1) return prevLesson;
        
        const [draggedItem] = subStages.splice(draggedIndex, 1);
        subStages.splice(dropTargetIndex, 0, draggedItem);

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
    if (selectedItem?.type === 'substage') {
      updateLessonData({ interactionType: newType });
    }
    setIsInteractionModalOpen(false);
  };
  
  const handleContentOutputSelect = (contentOutputId: number) => {
    if (selectedItem?.type === 'substage') {
      updateLessonData({ contentOutputId });
    }
    setIsContentModalOpen(false);
  };

  const selectedItemData = selectionDetails.item;
  const isNavCollapsed = navWidth === 0;

  const selectedSubstage = selectedItem.type === 'substage' ? (selectionDetails.item as SubStage) : null;
  const linkedContentForBuilder = selectedSubstage?.contentOutputId 
      ? MOCK_CONTENT_OUTPUTS.find(co => co.id === selectedSubstage.contentOutputId)
      : null;

  return (
    <div className="h-screen bg-brand-dark text-white font-sans overflow-hidden md:flex">
       {isMobileNavOpen && (
            <div onClick={() => setIsMobileNavOpen(false)} className="fixed inset-0 bg-black/60 z-30 md:hidden" />
        )}
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
        <SelectContentOutputModal
            isOpen={isContentModalOpen}
            onClose={() => setIsContentModalOpen(false)}
            onSelect={handleContentOutputSelect}
        />
        {/* Snackbar */}
        <div 
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-brand-red text-white py-2 px-6 rounded-lg shadow-lg transition-transform duration-300 z-50 ${snackbar.visible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
            role="alert"
            aria-live="assertive"
        >
            {snackbar.message}
        </div>

      <aside 
        style={{ width: `${navWidth}px` }}
        className={`h-screen flex-col bg-brand-black transition-transform duration-300 ease-in-out z-40 
                   fixed w-80 top-0 left-0 transform ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'} 
                   md:relative md:w-auto md:transform-none md:flex md:flex-shrink-0`}
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
                    onReorderStage={handleReorderStage}
                    onExit={onExit}
                    onToggleCollapse={toggleNavCollapse}
                    onCloseMobileNav={() => setIsMobileNavOpen(false)}
                    />
                )
            ) : (
                <ContentProcessingNav 
                    onExit={onExit}
                    onToggleCollapse={toggleNavCollapse}
                    onCloseMobileNav={() => setIsMobileNavOpen(false)}
                    onProcessedContentChange={(content) => {
                      if (content) {
                          const newContentOutput = { id: content.id, name: content.name };
                          // This is a mock implementation; in a real app, you'd manage a global list of content outputs
                          // and then link the ID here.
                          console.log("New content processed:", newContentOutput);
                      }
                    }}
                />
            )
        )}
      </aside>

      <div 
          onMouseDown={handleMouseDown}
          className="w-2 h-full bg-gray-900 hover:bg-brand-red cursor-col-resize items-center justify-center relative group hidden md:flex"
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
      
      <div className="flex-1 flex flex-col h-screen relative">
        {isNavCollapsed && (
            <button
                onClick={toggleNavCollapse}
                className="absolute hidden md:block z-20 top-6 left-4 bg-gray-800 hover:bg-brand-red text-white p-2 rounded-full transition-opacity"
                title="Expand Navigation"
            >
                <ChevronDoubleRightIcon className="w-5 h-5" />
            </button>
        )}
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-brand-black border-b border-gray-700 flex-shrink-0">
            <button onClick={() => setIsMobileNavOpen(true)} className="text-white p-1">
                <MenuIcon className="w-6 h-6" />
            </button>
            <span className="font-semibold text-lg">{currentBuilderView === 'builder' ? 'Lesson Builder' : 'Substage Content'}</span>
            <div className="w-7"></div>
        </header>

        <main className="flex-1 p-6 md:p-8 lg:p-12 overflow-y-auto">
            {currentBuilderView === 'builder' ? (
                selectedItemData ? (
                    <ItemConfiguration 
                        item={selectedItemData}
                        itemType={selectedItem.type}
                        parentStageType={selectionDetails.parentStageType}
                        onUpdate={updateLessonData}
                        onOpenInteractionModal={() => setIsInteractionModalOpen(true)}
                        onOpenContentModal={() => setIsContentModalOpen(true)}
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
                <LessonContentBuilder 
                  substage={selectedSubstage}
                  processedContent={linkedContentForBuilder ? { id: linkedContentForBuilder.id, name: linkedContentForBuilder.name } : null}
                  onOpenInteractionModal={() => setIsInteractionModalOpen(true)}
                  onOpenContentModal={() => setIsContentModalOpen(true)}
                />
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
                    onClick={() => {
                        if (selectedItem.type === 'substage') {
                            setCurrentBuilderView('substageContent');
                        } else {
                            showSnackbar("You must select a sub-stage to edit content.");
                        }
                    }}
                    className={`px-4 py-1 text-sm font-semibold rounded-md transition-colors ${currentBuilderView === 'substageContent' ? 'bg-brand-red text-white' : 'text-brand-gray hover:bg-gray-700'}`}
                    title={selectedItem.type !== 'substage' ? "You must select a sub-stage to edit content" : "Edit Substage Content"}
                >
                    Substage Content
                </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LessonBuilderPage;