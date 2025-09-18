import React, { useState, useMemo, useEffect } from 'react';
import { CloseIcon } from './Icon';
import { INTERACTION_TYPES, STAGE_TYPES, SUB_STAGE_TYPES_MAP } from '../data/lessonBuilderData';
import type { StageType, SubStageType } from '../types';

interface ChangeInteractionTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (interactionType: string) => void;
  currentStageType?: StageType;
  currentSubStageType?: SubStageType;
}

const ChangeInteractionTypeModal: React.FC<ChangeInteractionTypeModalProps> = ({ 
    isOpen, onClose, onSelect, currentStageType, currentSubStageType 
}) => {
  const [filterType, setFilterType] = useState<'all' | 'stage' | 'substage'>('all');
  const [stageFilter, setStageFilter] = useState<StageType | ''>('');
  const [subStageFilter, setSubStageFilter] = useState<SubStageType | '' | string>('');

  useEffect(() => {
    if (isOpen) {
      if (currentSubStageType) {
        setFilterType('substage');
        setSubStageFilter(currentSubStageType);
        setStageFilter(currentStageType || '');
      } else if (currentStageType) {
        setFilterType('stage');
        setStageFilter(currentStageType);
        setSubStageFilter('');
      } else {
        setFilterType('all');
        setStageFilter('');
        setSubStageFilter('');
      }
    }
  }, [isOpen, currentStageType, currentSubStageType]);

  const filteredInteractions = useMemo(() => {
    let interactions = INTERACTION_TYPES;
    if (filterType === 'stage' && stageFilter) {
      interactions = interactions.filter(it => it.stage === stageFilter);
    }
    if (filterType === 'substage' && subStageFilter) {
        interactions = interactions.filter(it => it.subStage === subStageFilter);
    }
    return interactions;
  }, [filterType, stageFilter, subStageFilter]);

  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
        onClick={onClose}
    >
      <div 
        className="bg-brand-dark rounded-lg shadow-xl w-full max-w-3xl h-[80vh] flex flex-col p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Change Interaction Type</h2>
          <button onClick={onClose} className="text-brand-gray hover:text-white transition-colors">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center bg-brand-black rounded-md p-1">
                <button onClick={() => setFilterType('all')} className={`px-3 py-1 text-sm rounded ${filterType === 'all' ? 'bg-brand-red' : ''}`}>All</button>
                <button onClick={() => setFilterType('stage')} className={`px-3 py-1 text-sm rounded ${filterType === 'stage' ? 'bg-brand-red' : ''}`}>By Stage</button>
                <button onClick={() => setFilterType('substage')} className={`px-3 py-1 text-sm rounded ${filterType === 'substage' ? 'bg-brand-red' : ''}`}>By Sub-stage</button>
            </div>
            {filterType === 'stage' && (
                <select value={stageFilter} onChange={e => setStageFilter(e.target.value as StageType)} className="bg-brand-black border border-gray-600 rounded p-1.5">
                    <option value="">Select a Stage Type</option>
                    {STAGE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            )}
            {filterType === 'substage' && (
                <select value={subStageFilter} onChange={e => setSubStageFilter(e.target.value)} className="bg-brand-black border border-gray-600 rounded p-1.5">
                    <option value="">Select a Sub-stage Type</option>
                    {Object.values(SUB_STAGE_TYPES_MAP).flat().filter((v, i, a) => a.indexOf(v) === i).map(ss => <option key={ss} value={ss}>{ss}</option>)}
                </select>
            )}
        </div>

        {/* Interaction List */}
        <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInteractions.map((interaction, index) => (
              <button 
                key={index}
                onClick={() => onSelect(interaction.name)}
                className="bg-brand-black p-4 rounded-md text-left hover:bg-gray-800 hover:ring-2 hover:ring-brand-red transition-all"
              >
                <h3 className="font-bold text-white">{interaction.name}</h3>
                <p className="text-xs text-brand-gray mt-1">{interaction.stage} &gt; {interaction.subStage}</p>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ChangeInteractionTypeModal;