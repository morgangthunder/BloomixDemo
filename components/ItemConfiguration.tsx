import React, { useMemo } from 'react';
import type { Lesson, Stage, SubStage, StageType } from '../types';
import { STAGE_TYPES, SUB_STAGE_TYPES_MAP, MOCK_CONTENT_OUTPUTS } from '../data/lessonBuilderData';
import TypeChip from './TypeChip';
import { TrashIcon } from './Icon';

interface ItemConfigurationProps {
  item: Lesson | Stage | SubStage;
  itemType: 'lesson' | 'stage' | 'substage';
  parentStageType?: StageType;
  onUpdate: (updatedData: Partial<Lesson | Stage | SubStage>) => void;
  onOpenInteractionModal: () => void;
  onOpenContentModal: () => void;
  onDelete: () => void;
  activeInput: string | null;
  setActiveInput: (id: string | null) => void;
}

const commonInputClasses = "w-full bg-brand-dark border border-gray-600 rounded-md p-2 text-white focus:outline-none";
const commonLabelClasses = "block text-sm font-medium text-brand-gray mb-1";


const ItemConfiguration: React.FC<ItemConfigurationProps> = ({ 
    item, itemType, parentStageType, onUpdate, onOpenInteractionModal, onOpenContentModal, onDelete, activeInput, setActiveInput 
}) => {

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onUpdate({ [name]: name === 'duration' ? parseInt(value, 10) : value });
  };
  
  const calculateDuration = () => {
      if (itemType === 'lesson') {
          return (item as Lesson).stages.reduce((total, stage) => 
              total + stage.subStages.reduce((stageTotal, subStage) => stageTotal + subStage.duration, 0), 0);
      }
      if (itemType === 'stage') {
          return (item as Stage).subStages.reduce((total, subStage) => total + subStage.duration, 0);
      }
      return (item as SubStage).duration;
  };

  const getInputClasses = (id: string) => {
    return `${commonInputClasses} ${activeInput === id ? 'ring-2 ring-brand-red' : ''}`;
  };

  const linkedContentOutput = useMemo(() => {
      if (itemType === 'substage') {
          const subStage = item as SubStage;
          if (subStage.contentOutputId) {
              return MOCK_CONTENT_OUTPUTS.find(co => co.id === subStage.contentOutputId);
          }
      }
      return null;
  }, [item, itemType]);

  const renderLessonConfig = () => {
    const lesson = item as Lesson;
    return (
      <div>
        <label htmlFor="title" className={commonLabelClasses}>Lesson Title</label>
        <input 
          type="text" 
          id="title" 
          name="title" 
          value={lesson.title} 
          onChange={handleInputChange} 
          onFocus={() => setActiveInput(`lesson-${lesson.id}-title`)}
          className={getInputClasses(`lesson-${lesson.id}-title`)} 
        />
      </div>
    );
  };
  
  const renderStageConfig = () => {
    const stage = item as Stage;
    return (
      <div className="space-y-4">
        <div>
          <label htmlFor="title" className={commonLabelClasses}>Stage Title</label>
          <input 
            type="text" 
            id="title" 
            name="title" 
            value={stage.title} 
            onChange={handleInputChange}
            onFocus={() => setActiveInput(`stage-${stage.id}-title`)}
            className={getInputClasses(`stage-${stage.id}-title`)} 
          />
        </div>
        <div>
          <label htmlFor="type" className={commonLabelClasses}>Stage Type</label>
          <select 
            id="type" 
            name="type" 
            value={stage.type} 
            onChange={handleInputChange}
            onFocus={() => setActiveInput(`stage-${stage.id}-type`)}
            className={getInputClasses(`stage-${stage.id}-type`)}
          >
            {STAGE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
      </div>
    );
  };

  const renderSubStageConfig = () => {
    const subStage = item as SubStage;
    const subStageTypeOptions = parentStageType ? SUB_STAGE_TYPES_MAP[parentStageType] : [];

    return (
      <div className="space-y-4">
         <div>
          <label htmlFor="title" className={commonLabelClasses}>Sub-stage Title</label>
          <input 
            type="text" 
            id="title" 
            name="title" 
            value={subStage.title} 
            onChange={handleInputChange}
            onFocus={() => setActiveInput(`substage-${subStage.id}-title`)}
            className={getInputClasses(`substage-${subStage.id}-title`)}
          />
        </div>
        {parentStageType && (
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-brand-gray">Parent Stage Type:</span>
            <TypeChip type={parentStageType} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className={commonLabelClasses}>Sub-stage Type</label>
              <select 
                id="type" 
                name="type" 
                value={subStage.type} 
                onChange={handleInputChange}
                onFocus={() => setActiveInput(`substage-${subStage.id}-type`)}
                className={getInputClasses(`substage-${subStage.id}-type`)}
                disabled={!parentStageType}
              >
                {!parentStageType && <option>Select parent stage type first</option>}
                {subStageTypeOptions.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
             <div>
                <label htmlFor="duration" className={commonLabelClasses}>Duration (minutes)</label>
                <input 
                    type="number" 
                    id="duration" 
                    name="duration" 
                    value={subStage.duration} 
                    onChange={handleInputChange} 
                    onFocus={() => setActiveInput(`substage-${subStage.id}-duration`)}
                    className={getInputClasses(`substage-${subStage.id}-duration`)}
                    min="1" 
                />
            </div>
        </div>
      </div>
    );
  };
  
  const hasInteraction = itemType === 'substage' && (item as SubStage).interactionType && (item as SubStage).interactionType !== 'None';
  
  return (
    <>
      <div className="space-y-8">
        {/* --- Top Configuration Section --- */}
        <section className="bg-brand-black p-6 rounded-lg border border-gray-700 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                  <h1 className="text-3xl font-bold capitalize">{itemType} Configuration</h1>
                  {itemType === 'stage' && <TypeChip type={(item as Stage).type} className="mt-2" />}
              </div>
               <div className="flex items-start space-x-4">
                  <div className="text-right">
                      <span className={commonLabelClasses}>Total Duration</span>
                      <p className="text-2xl font-semibold text-brand-red">{calculateDuration()} min</p>
                  </div>
                  {itemType !== 'lesson' && (
                       <button 
                          onClick={onDelete} 
                          className="p-2 text-brand-gray hover:text-white hover:bg-red-500/50 rounded-full transition-colors"
                          title={`Delete ${itemType}`}
                      >
                          <TrashIcon className="w-5 h-5" />
                      </button>
                  )}
               </div>
            </div>
          
          {itemType === 'lesson' && renderLessonConfig()}
          {itemType === 'stage' && renderStageConfig()}
          {itemType === 'substage' && renderSubStageConfig()}
        </section>

        {/* --- Preview Section --- */}
        <section>
            <div className="flex flex-wrap justify-between items-baseline mb-4 gap-x-6 gap-y-2">
              <h2 className="text-2xl font-bold">Student Preview</h2>
              {itemType === 'substage' && (
                  <div className="flex flex-wrap flex-col sm:flex-row sm:items-center justify-end gap-y-2 gap-x-4 text-sm text-right">
                      {/* Interaction Type */}
                      <div className="flex items-center justify-end">
                          <span className="text-brand-gray mr-2 shrink-0">Interaction Type:</span>
                          <strong className="text-white">{hasInteraction ? (item as SubStage).interactionType : 'None'}</strong>
                          <button onClick={onOpenInteractionModal} className="ml-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded text-xs transition-colors shrink-0">
                              {hasInteraction ? 'Change' : 'Add'}
                          </button>
                      </div>
                      {/* Content Section */}
                      <div className="flex items-center justify-end">
                          <span className="text-brand-gray mr-2 shrink-0">Processed Content:</span>
                          {linkedContentOutput ? (
                              <div className="flex items-center space-x-2">
                                  <strong className="text-white" title={linkedContentOutput.name}>{linkedContentOutput.name}</strong>
                                  <TypeChip type={linkedContentOutput.processType} />
                              </div>
                          ) : (
                              <strong className="text-white">None</strong>
                          )}
                          <button onClick={onOpenContentModal} className="ml-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded text-xs transition-colors shrink-0">
                              {linkedContentOutput ? 'Change' : 'Select'}
                          </button>
                      </div>
                  </div>
              )}
            </div>
          
            <div className="bg-brand-black rounded-lg min-h-[40vh] flex flex-col border border-gray-700">
               <div className="flex-1 flex items-center justify-center text-brand-gray text-center p-8">
                  {itemType === 'substage' ? (
                      hasInteraction ? (
                          <p>Configuration for '{(item as SubStage).interactionType}' will show here.</p>
                      ) : (
                          <p>No interaction type selected.</p>
                      )
                  ) : (
                      <p>What the student will see for this {itemType}.</p>
                  )}
               </div>
               <div className="p-4 border-t border-gray-700 h-20 flex items-center justify-center">
                  <p className="text-sm text-brand-gray">Timeline placeholder</p>
               </div>
            </div>
        </section>
      </div>
    </>
  );
};

export default ItemConfiguration;