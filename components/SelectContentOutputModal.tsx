import React from 'react';
import { CloseIcon } from './Icon';
import { MOCK_CONTENT_OUTPUTS } from '../data/lessonBuilderData';
import TypeChip from './TypeChip';
import type { ContentOutput } from '../types';

interface SelectContentOutputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (contentOutputId: number) => void;
}

const SelectContentOutputModal: React.FC<SelectContentOutputModalProps> = ({ isOpen, onClose, onSelect }) => {
  if (!isOpen) return null;

  const handleSelect = (item: ContentOutput) => {
    onSelect(item.id);
    onClose();
  };

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
        onClick={onClose}
    >
      <div 
        className="bg-brand-dark rounded-lg shadow-xl w-full max-w-2xl h-[70vh] flex flex-col p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Select Content Output</h2>
          <button onClick={onClose} className="text-brand-gray hover:text-white transition-colors">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            <div className="space-y-2">
                {MOCK_CONTENT_OUTPUTS.map(item => (
                    <button 
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className="w-full flex items-center justify-between text-left p-3 bg-brand-black rounded-md hover:bg-gray-800 transition-colors"
                    >
                        <span className="text-brand-light-gray truncate font-semibold">{item.name}</span>
                        <TypeChip type={item.processType} />
                    </button>
                ))}
                 {MOCK_CONTENT_OUTPUTS.length === 0 && (
                    <div className="flex items-center justify-center h-full text-brand-gray">
                        <p>No content outputs available. Process some content first.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default SelectContentOutputModal;
