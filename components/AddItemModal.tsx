import React, { useState, useEffect } from 'react';
import { CloseIcon } from './Icon';
import type { StageType, SubStageType } from '../types';
import { STAGE_TYPES, SUB_STAGE_TYPES_MAP } from '../data/lessonBuilderData';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { title: string; type: StageType | SubStageType; duration?: number }) => void;
  config: { mode: 'stage' | 'substage', stageId?: number, stageType?: StageType } | null;
}

const commonInputClasses = "w-full bg-brand-black border border-gray-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-red";
const commonLabelClasses = "block text-sm font-medium text-brand-gray mb-1";

const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose, onAdd, config }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [duration, setDuration] = useState(5);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      if (config?.mode === 'stage') {
        setType(STAGE_TYPES[0]);
      } else if (config?.mode === 'substage' && config.stageType) {
        setType(SUB_STAGE_TYPES_MAP[config.stageType][0]);
      } else {
        setType('');
      }
      setDuration(5);
    }
  }, [isOpen, config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !type) {
      alert('Please fill out all fields.');
      return;
    }
    onAdd({
      title,
      type: type as StageType | SubStageType,
      duration: config?.mode === 'substage' ? duration : undefined,
    });
  };

  if (!isOpen || !config) return null;

  const { mode, stageType } = config;
  const subStageTypeOptions = stageType ? SUB_STAGE_TYPES_MAP[stageType] : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-brand-dark rounded-lg shadow-xl w-full max-w-lg flex flex-col p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">Add New {mode === 'stage' ? 'Stage' : 'Sub-stage'}</h2>
          <button onClick={onClose} className="text-brand-gray hover:text-white transition-colors">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className={commonLabelClasses}>{mode === 'stage' ? 'Stage' : 'Sub-stage'} Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={commonInputClasses}
              placeholder={`Enter the title`}
              required
            />
          </div>

          <div>
            <label htmlFor="type" className={commonLabelClasses}>{mode === 'stage' ? 'Stage' : 'Sub-stage'} Type</label>
            <select
              id="type"
              value={type}
              onChange={e => setType(e.target.value)}
              className={commonInputClasses}
              required
            >
              {mode === 'stage' 
                ? STAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)
                : subStageTypeOptions.map(t => <option key={t} value={t}>{t}</option>)
              }
            </select>
          </div>

          {mode === 'substage' && (
            <div>
              <label htmlFor="duration" className={commonLabelClasses}>Duration (minutes)</label>
              <input
                id="duration"
                type="number"
                min="1"
                value={duration}
                onChange={e => setDuration(parseInt(e.target.value, 10))}
                className={commonInputClasses}
                required
              />
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={onClose} className="bg-gray-600 text-white font-bold py-2 px-4 rounded hover:bg-gray-500 transition-colors">
              Cancel
            </button>
            <button type="submit" className="bg-brand-red text-white font-bold py-2 px-4 rounded hover:bg-opacity-80 transition-colors">
              Add {mode === 'stage' ? 'Stage' : 'Sub-stage'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddItemModal;