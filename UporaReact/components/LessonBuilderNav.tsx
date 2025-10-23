import React, { useState } from 'react';
import type { Lesson, Stage, SubStage } from '../types';
import type { SelectedItem } from './LessonBuilderPage';
import { ArrowLeftIcon, ChevronDoubleLeftIcon, ChevronDownIcon, ChevronRightIcon, DocumentTextIcon, PlusCircleIcon, TrashIcon, GripVerticalIcon, CloseIcon } from './Icon';
import TypeChip from './TypeChip';

type DraggedItemInfo = {
    type: 'stage' | 'substage';
    id: number;
    stageId?: number;
} | null;

interface LessonBuilderNavProps {
  lesson: Lesson;
  selectedItem: SelectedItem | null;
  onSelectItem: (item: SelectedItem) => void;
  onShowScript: () => void;
  onAddStage: () => void;
  onAddSubStage: (stageId: number) => void;
  onDelete: (item: SelectedItem) => void;
  onReorderSubStage: (stageId: number, draggedId: number, targetId: number) => void;
  onReorderStage: (draggedId: number, targetId: number) => void;
  onExit: () => void;
  onToggleCollapse: () => void;
  onCloseMobileNav?: () => void;
}

const NavItem: React.FC<{
    onClick: () => void;
    isSelected: boolean;
    children: React.ReactNode;
    className?: string;
    dragProps?: React.HTMLAttributes<HTMLDivElement>;
}> = ({ onClick, isSelected, children, className = '', dragProps }) => (
    <div 
        onClick={onClick}
        className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-brand-red text-white' : 'hover:bg-gray-700'} ${className}`}
        {...dragProps}
    >
        {children}
    </div>
);

const StageNavItem: React.FC<{
    stage: Stage;
    selectedItem: SelectedItem | null;
    onSelectItem: (item: SelectedItem) => void;
    onAddSubStage: (stageId: number) => void;
    onDelete: (item: SelectedItem) => void;
    setDraggedItem: (info: DraggedItemInfo) => void;
    draggedItem: DraggedItemInfo;
    onReorderStage: (draggedId: number, targetId: number) => void;
    onReorderSubStage: (stageId: number, draggedId: number, targetId: number) => void;
}> = ({ stage, selectedItem, onSelectItem, onAddSubStage, onDelete, setDraggedItem, draggedItem, onReorderStage, onReorderSubStage }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isDraggedOver, setIsDraggedOver] = useState(false);
    const isStageSelected = selectedItem?.type === 'stage' && selectedItem.id === stage.id;

    const handleDragStart = (e: React.DragEvent) => {
        setDraggedItem({ type: 'stage', id: stage.id });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedItem?.type === 'stage' && draggedItem.id !== stage.id) {
            setIsDraggedOver(true);
        }
    };
    
    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggedOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggedOver(false);
        if (draggedItem?.type === 'stage' && draggedItem.id !== stage.id) {
            onReorderStage(draggedItem.id, stage.id);
        }
        setDraggedItem(null);
    };

    return (
        <div 
            className={`ml-4 border-t-2 transition-colors ${isDraggedOver ? 'border-brand-red' : 'border-transparent'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <NavItem 
                onClick={() => onSelectItem({ type: 'stage', id: stage.id })}
                isSelected={isStageSelected}
                dragProps={{ draggable: true, onDragStart: handleDragStart }}
            >
                <div className="flex items-center min-w-0">
                    <GripVerticalIcon className="w-5 h-5 mr-1 text-brand-gray cursor-grab group-hover:text-white flex-shrink-0" />
                    <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="mr-2 p-1 hover:bg-gray-600 rounded-full flex-shrink-0">
                        {isExpanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                    </button>
                    <span className="font-semibold truncate" title={stage.title}>{stage.title}</span>
                </div>
                 <div className="flex items-center space-x-2 flex-shrink-0">
                    <TypeChip type={stage.type} />
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete({ type: 'stage', id: stage.id }); }} 
                        className="p-1 rounded-full text-brand-gray hover:text-white hover:bg-red-500/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete Stage"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                 </div>
            </NavItem>
            {isExpanded && (
                <div className="pl-6 border-l border-gray-600 ml-3 my-1 space-y-1">
                    {stage.subStages.map(subStage => (
                        <SubStageNavItem 
                            key={subStage.id}
                            subStage={subStage}
                            stageId={stage.id}
                            selectedItem={selectedItem}
                            onSelectItem={onSelectItem}
                            onDelete={onDelete}
                            setDraggedItem={setDraggedItem}
                            draggedItem={draggedItem}
                            onReorderSubStage={onReorderSubStage}
                        />
                    ))}
                     <button onClick={() => onAddSubStage(stage.id)} className="flex items-center text-sm text-brand-gray hover:text-white transition-colors p-2 w-full">
                        <PlusCircleIcon className="w-4 h-4 mr-2" />
                        Add Sub-stage
                    </button>
                </div>
            )}
        </div>
    );
};

const SubStageNavItem: React.FC<{
    subStage: SubStage;
    stageId: number;
    selectedItem: SelectedItem | null;
    onSelectItem: (item: SelectedItem) => void;
    onDelete: (item: SelectedItem) => void;
    setDraggedItem: (info: DraggedItemInfo) => void;
    draggedItem: DraggedItemInfo;
    onReorderSubStage: (stageId: number, draggedId: number, targetId: number) => void;
}> = ({ subStage, stageId, selectedItem, onSelectItem, onDelete, setDraggedItem, draggedItem, onReorderSubStage }) => {
    const isSubStageSelected = selectedItem?.type === 'substage' && selectedItem.id === subStage.id;
    const [isDraggedOver, setIsDraggedOver] = useState(false);

    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation();
        setDraggedItem({ type: 'substage', id: subStage.id, stageId: stageId });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedItem?.type === 'substage' && draggedItem.stageId === stageId && draggedItem.id !== subStage.id) {
            setIsDraggedOver(true);
        }
    };
    
    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggedOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggedOver(false);
        if (draggedItem?.type === 'substage' && draggedItem.stageId === stageId && draggedItem.id !== subStage.id) {
            onReorderSubStage(stageId, draggedItem.id, subStage.id);
        }
        setDraggedItem(null);
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-t-2 transition-colors ${isDraggedOver ? 'border-brand-red' : 'border-transparent'}`}
        >
            <NavItem
                onClick={() => onSelectItem({ type: 'substage', id: subStage.id, stageId: stageId })}
                isSelected={isSubStageSelected}
                dragProps={{ draggable: true, onDragStart: handleDragStart }}
            >
                <div className="flex items-center min-w-0">
                    <GripVerticalIcon className="w-5 h-5 mr-1 text-brand-gray cursor-grab group-hover:text-white flex-shrink-0" />
                    <span className="text-sm truncate" title={subStage.title}>{subStage.title}</span>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                    <TypeChip type={subStage.type} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete({ type: 'substage', id: subStage.id, stageId }); }} 
                        className="p-1 rounded-full text-brand-gray hover:text-white hover:bg-red-500/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete Sub-stage"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </NavItem>
        </div>
    );
};

const LessonBuilderNav: React.FC<LessonBuilderNavProps> = ({ lesson, selectedItem, onSelectItem, onShowScript, onAddStage, onAddSubStage, onDelete, onReorderSubStage, onReorderStage, onExit, onToggleCollapse, onCloseMobileNav }) => {
    const isLessonSelected = selectedItem?.type === 'lesson';
    const canShowScript = selectedItem?.type === 'substage';
    const [draggedItem, setDraggedItem] = useState<DraggedItemInfo>(null);

    return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
        <div className="flex-shrink-0 pb-4 border-b border-gray-700">
            <button onClick={onExit} className="flex items-center text-sm text-brand-gray hover:text-white transition-colors mb-4">
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Hub
            </button>
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold">Lesson Structure</h2>
                    <button 
                        onClick={onShowScript} 
                        disabled={!canShowScript}
                        className={`text-sm mt-1 text-brand-red hover:underline disabled:text-gray-600 disabled:no-underline disabled:cursor-not-allowed transition-colors`}
                        title="View Substage Script"
                    >
                        View Substage Script
                    </button>
                </div>
                <div className="flex items-center space-x-2">
                    {onCloseMobileNav && (
                        <button onClick={onCloseMobileNav} className="p-2 text-brand-gray hover:text-white md:hidden">
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    )}
                    <button 
                        onClick={onToggleCollapse}
                        className="p-2 rounded-md text-brand-light-gray hover:bg-gray-700 transition-colors hidden md:block"
                        title="Collapse Sidebar"
                    >
                        <ChevronDoubleLeftIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
        <nav 
            className="flex-1 overflow-y-auto mt-4 space-y-2 pr-2 scrollbar-thin scrollbar-thumb-gray-700"
            onDragEnd={() => setDraggedItem(null)}
        >
            <NavItem 
                onClick={() => onSelectItem({ type: 'lesson', id: lesson.id })}
                isSelected={isLessonSelected}
            >
                <span className="font-bold text-lg truncate" title={lesson.title}>{lesson.title}</span>
            </NavItem>

            <div className="space-y-2">
                {lesson.stages.map(stage => (
                    <StageNavItem
                        key={stage.id}
                        stage={stage}
                        selectedItem={selectedItem}
                        onSelectItem={onSelectItem}
                        onAddSubStage={() => onAddSubStage(stage.id)}
                        onDelete={onDelete}
                        setDraggedItem={setDraggedItem}
                        draggedItem={draggedItem}
                        onReorderStage={onReorderStage}
                        onReorderSubStage={onReorderSubStage}
                    />
                ))}
            </div>

            <button onClick={onAddStage} className="flex items-center text-sm text-brand-gray hover:text-white transition-colors p-2 mt-4 w-full ml-4">
                <PlusCircleIcon className="w-5 h-5 mr-2" />
                Add Stage
            </button>
        </nav>
    </div>
  );
};

export default LessonBuilderNav;