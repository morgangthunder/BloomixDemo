import React from 'react';
import { MOCK_CONTENT_OUTPUTS } from '../data/lessonBuilderData';
import TypeChip from './TypeChip';
import type { SubStage } from '../types';
import { ExpandIcon, MinimizeIcon } from './Icon';

interface LessonContentBuilderProps {
  substage: SubStage | null;
  processedContent: { id: number; name: string } | null;
  onOpenInteractionModal: () => void;
  onOpenContentModal: () => void;
  isPreviewFullscreen: boolean;
  onToggleFullscreen: () => void;
}

const LessonContentBuilder: React.FC<LessonContentBuilderProps> = ({
  substage,
  processedContent,
  onOpenInteractionModal,
  onOpenContentModal,
  isPreviewFullscreen,
  onToggleFullscreen,
}) => {
    const selectedInteractionType = substage?.interactionType || '';
    const hasInteraction = selectedInteractionType && selectedInteractionType !== 'None';
    const linkedContentOutput = processedContent ? MOCK_CONTENT_OUTPUTS.find(co => co.id === processedContent.id) : null;

    return (
        <div className={`h-full flex flex-col ${isPreviewFullscreen ? 'fixed inset-0 bg-brand-dark z-50 p-8' : ''}`}>
            {!isPreviewFullscreen && (
              <header className="flex flex-wrap justify-between items-baseline mb-6 gap-x-6 gap-y-4">
                  <div>
                      <h1 className="text-3xl font-bold">Substage Content</h1>
                      <h2 className="text-lg font-semibold text-brand-gray mt-1 truncate" title={substage?.title || 'No sub-stage selected'}>
                          Editing: {substage?.title || 'No sub-stage selected'}
                      </h2>
                  </div>
                   <div className="flex flex-wrap flex-col sm:flex-row sm:items-center justify-end gap-y-2 gap-x-4 text-sm text-right">
                      {/* Interaction Type */}
                      <div className="flex items-center justify-end">
                          <span className="text-brand-gray mr-2 shrink-0">Interaction Type:</span>
                          <strong className="text-white">{hasInteraction ? selectedInteractionType : 'None'}</strong>
                          <button 
                            onClick={onOpenInteractionModal} 
                            className="ml-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded text-xs transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!substage}
                          >
                              {hasInteraction ? 'Change' : 'Add'}
                          </button>
                      </div>
                      {/* Processed Content Section */}
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
                          <button 
                            onClick={onOpenContentModal} 
                            className="ml-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded text-xs transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!substage}
                          >
                              {linkedContentOutput ? 'Change' : 'Add'}
                          </button>
                      </div>
                  </div>
              </header>
            )}
            <main className="flex-1 bg-brand-black rounded-lg border border-gray-700 flex items-center justify-center p-4 relative">
                 <p className="text-brand-gray text-center">
                    {substage 
                        ? "View and configure the processed content as it applies to the selected interaction type."
                        : "Select a sub-stage from the navigation panel to begin editing its content."
                    }
                 </p>
                {isPreviewFullscreen ? (
                    <button onClick={onToggleFullscreen} className="absolute bottom-4 left-4 p-2 bg-black/50 rounded-full text-white hover:bg-brand-red transition-colors" title="Minimize">
                        <MinimizeIcon className="w-6 h-6" />
                    </button>
                ) : (
                     <button onClick={onToggleFullscreen} className="absolute bottom-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-brand-red transition-colors" title="Expand">
                        <ExpandIcon className="w-6 h-6" />
                    </button>
                )}
            </main>
        </div>
    );
};

export default LessonContentBuilder;