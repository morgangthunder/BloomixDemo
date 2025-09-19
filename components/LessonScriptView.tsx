import React, { useState, useEffect } from 'react';
import type { SubStage, ScriptBlock } from '../types';
import { ArrowLeftIcon, PlusCircleIcon, TrashIcon } from './Icon';

interface LessonScriptViewProps {
  subStage: SubStage | null;
  onBack: () => void;
}

const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const ScriptBlockEditor: React.FC<{
  block: ScriptBlock;
  onUpdate: (id: number, updatedBlock: Partial<ScriptBlock>) => void;
  onDelete: (id: number) => void;
  maxTime: number; // in seconds
}> = ({ block, onUpdate, onDelete, maxTime }) => {

  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    const timeInSeconds = parseInt(value, 10);
    if (!isNaN(timeInSeconds) && timeInSeconds >= 0 && timeInSeconds <= maxTime) {
      if (field === 'startTime' && timeInSeconds > block.endTime) return;
      if (field === 'endTime' && timeInSeconds < block.startTime) return;
      onUpdate(block.id, { [field]: timeInSeconds });
    }
  };
  
  return (
    <div className="bg-brand-dark p-3 rounded-lg border border-gray-700 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
            <input 
              type="number" 
              value={block.startTime}
              onChange={(e) => handleTimeChange('startTime', e.target.value)}
              className="bg-gray-800 text-white rounded w-16 p-1 text-center text-sm"
              min="0"
              max={maxTime}
            />
            <span>-</span>
            <input 
              type="number" 
              value={block.endTime}
              onChange={(e) => handleTimeChange('endTime', e.target.value)}
              className="bg-gray-800 text-white rounded w-16 p-1 text-center text-sm"
              min="0"
              max={maxTime}
            />
             <span className="text-xs text-brand-gray">({formatTime(block.startTime)} - {formatTime(block.endTime)})</span>
        </div>
        <button onClick={() => onDelete(block.id)} className="text-gray-500 hover:text-red-500">
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>

      {block.type === 'action' ? (
        <select 
          value={block.content}
          onChange={(e) => onUpdate(block.id, { content: e.target.value })}
          className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white text-sm"
        >
          <option value="">Select an Action</option>
          <option value="Action 1">Placeholder Action 1</option>
          <option value="Action 2">Placeholder Action 2</option>
          <option value="Action 3">Placeholder Action 3</option>
        </select>
      ) : (
        <textarea
          placeholder="Enter teacher talk here..."
          value={block.content}
          onChange={(e) => onUpdate(block.id, { content: e.target.value })}
          className="w-full bg-gray-800 border border-gray-600 rounded-md p-2 text-white text-sm h-24 resize-none focus:bg-gray-900 focus:border-red-500/50 outline-none ring-0"
        />
      )}
    </div>
  );
};


const LessonScriptView: React.FC<LessonScriptViewProps> = ({ subStage, onBack }) => {
  const [script, setScript] = useState<ScriptBlock[]>(subStage?.script || []);

  useEffect(() => {
    setScript(subStage?.script || []);
  }, [subStage]);

  const subStageDurationSecs = (subStage?.duration || 0) * 60;
  
  const calculateUsedTime = () => script.reduce((acc, block) => acc + (block.endTime - block.startTime), 0);

  const addBlock = (type: 'action' | 'teacherTalk') => {
    const lastBlock = script[script.length - 1];
    const newStartTime = lastBlock ? lastBlock.endTime : 0;
    
    if (newStartTime >= subStageDurationSecs) {
        alert("No more time available in this sub-stage.");
        return;
    }

    const newBlock: ScriptBlock = {
      id: Date.now(),
      type,
      content: '',
      startTime: newStartTime,
      endTime: Math.min(newStartTime + 60, subStageDurationSecs)
    };
    setScript([...script, newBlock]);
  };
  
  const updateBlock = (id: number, updatedBlock: Partial<ScriptBlock>) => {
    setScript(script.map(block => block.id === id ? { ...block, ...updatedBlock } : block));
  }

  const deleteBlock = (id: number) => {
    setScript(script.filter(block => block.id !== id));
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex-shrink-0 pb-4 border-b border-gray-700">
         <button onClick={onBack} className="flex items-center text-sm text-brand-gray hover:text-white transition-colors mb-3">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Lesson Structure
        </button>
        <h2 className="text-xl font-bold truncate" title={subStage?.title}>
          Script: {subStage?.title || 'No Sub-stage Selected'}
        </h2>
        <div className="flex justify-between items-baseline mt-2 text-sm">
            <span className="text-brand-gray">Total Duration:</span>
            <span className="font-semibold text-white">{formatTime(subStageDurationSecs)}</span>
        </div>
        <div className="flex justify-between items-baseline text-sm">
            <span className="text-brand-gray">Time Used:</span>
            <span className="font-semibold text-white">{formatTime(calculateUsedTime())}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-2 scrollbar-thin scrollbar-thumb-gray-700">
        {script.map(block => (
            <ScriptBlockEditor 
                key={block.id}
                block={block}
                onUpdate={updateBlock}
                onDelete={deleteBlock}
                maxTime={subStageDurationSecs}
            />
        ))}

        <div className="flex items-center justify-center space-x-4 pt-4">
            <button onClick={() => addBlock('teacherTalk')} className="flex items-center text-sm text-brand-gray hover:text-white transition-colors">
                <PlusCircleIcon className="w-4 h-4 mr-1" />
                Teacher Talk
            </button>
             <button onClick={() => addBlock('action')} className="flex items-center text-sm text-brand-gray hover:text-white transition-colors">
                <PlusCircleIcon className="w-4 h-4 mr-1" />
                Action
            </button>
        </div>
      </div>
    </div>
  );
};

export default LessonScriptView;