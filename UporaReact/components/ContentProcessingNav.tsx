import React, { useState } from 'react';
import { ArrowLeftIcon, ChevronDoubleLeftIcon, PlusCircleIcon, LinkIcon, UploadIcon, DocumentDuplicateIcon, CloseIcon } from './Icon';
import ContentBrowserModal from './ContentBrowserModal';
import type { SelectedItem } from './LessonBuilderPage';
import UploadN8NJsonModal from './UploadN8NJsonModal';
import SelectOutputModal from './SelectOutputModal';
import type { ContentOutput } from '../types';


interface ContentProcessingNavProps {
    onExit: () => void;
    onToggleCollapse: () => void;
    onCloseMobileNav?: () => void;
    onProcessedContentChange: (content: { id: number; name: string } | null) => void;
    selectedItem: SelectedItem | null;
    onShowScript: () => void;
    showSnackbar: (message: string) => void;
}

const MOCK_QAS = [
    { id: 1, q: "What is glossophobia?", a: "Glossophobia, or the fear of public speaking, is a common social phobia characterized by anxiety when speaking in front of an audience." },
    { id: 2, q: "What is the 'Power of Three' in public speaking?", a: "The 'Power of Three' is a writing principle suggesting that things that come in threes are inherently more humorous, satisfying, or effective than other numbers of things." },
    { id: 3, q: "Why is knowing your audience important?", a: "Understanding your audience helps you tailor your message, tone, and content to be more relatable, engaging, and persuasive, increasing the effectiveness of your speech." },
];

const PROCESS_TYPES = [
    "Upload N8N JSON",
    "Vectorize", "Extract Key Facts", "Extract Key Q&A Pairs", "Summarize Sections",
    "Chunk Content", "Identify Concepts & Skills", "Generate Interaction Prompts",
    "Annotate Entities", "Extract Multimedia Elements", "Classify Difficulty",
];

const OUTPUT_SETS = ["Key Q&A Pairs", "Section Summaries", "Concept Map Data"];

const ContentProcessingNav: React.FC<ContentProcessingNavProps> = ({ onExit, onToggleCollapse, onCloseMobileNav, onProcessedContentChange, selectedItem, onShowScript, showSnackbar }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedContent, setSelectedContent] = useState<{name: string, type: 'file' | 'link'} | null>(null);
    const [isProcessed, setIsProcessed] = useState(false);
    const [processType, setProcessType] = useState(PROCESS_TYPES[0]);
    const [outputName, setOutputName] = useState('');
    
    const [isUploadN8NModalOpen, setIsUploadN8NModalOpen] = useState(false);
    const [isSelectOutputModalOpen, setIsSelectOutputModalOpen] = useState(false);
    const [selectedOutput, setSelectedOutput] = useState<ContentOutput | null>(null);


    const canShowScript = selectedItem?.type === 'substage';
    
    const handleInteractionAttempt = () => {
        if (!selectedContent) {
            showSnackbar("You must add or select some source content first");
            return true; // Indicates an error occurred
        }
        return false;
    };

    const handleSelectContent = (content: {name: string, type: 'file' | 'link'}) => {
        setSelectedContent(content);
        setIsProcessed(false);
        setOutputName('');
        setSelectedOutput(null);
        onProcessedContentChange(null);
        setIsModalOpen(false);
    }
    
    const handleProcess = () => {
        if (handleInteractionAttempt()) return;
        
        if (processType === 'Upload N8N JSON') return;

        if (!outputName.trim()) {
            showSnackbar("Please provide a name for the processed content.");
            return;
        }
        setIsProcessed(true);
        // In a real app, this would be a backend call and the data would be real.
        const newContentOutput: ContentOutput = {
            id: Date.now(),
            name: outputName.trim(),
            processType: processType,
            source: selectedContent!, // We can use ! because handleInteractionAttempt checks it
            data: MOCK_QAS,
        };
        // Automatically select the new output for viewing and clear the name field.
        setSelectedOutput(newContentOutput);
        onProcessedContentChange(newContentOutput);
        setOutputName('');
    };
    
    return (
        <div className="h-full flex flex-col p-4 overflow-hidden">
            <ContentBrowserModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSelect={handleSelectContent}
            />
            <UploadN8NJsonModal
                isOpen={isUploadN8NModalOpen}
                onClose={() => setIsUploadN8NModalOpen(false)}
                onSave={(json) => console.log('N8N JSON Saved:', json)}
            />
            <SelectOutputModal
                isOpen={isSelectOutputModalOpen}
                onClose={() => setIsSelectOutputModalOpen(false)}
                onSelect={(output) => {
                    setSelectedOutput(output);
                    setIsProcessed(true); // Assume viewing an output means its "processed"
                    onProcessedContentChange(output);
                }}
            />
            <div className="flex-shrink-0 pb-4 border-b border-gray-700">
                <button onClick={onExit} className="flex items-center text-sm text-brand-gray hover:text-white transition-colors mb-4">
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Back to Hub
                </button>
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold">Source Content Processing</h2>
                        <button 
                            onClick={onShowScript} 
                            disabled={!canShowScript}
                            className={`text-sm mt-1 text-brand-red hover:underline disabled:text-gray-600 disabled:no-underline disabled:cursor-not-allowed transition-colors`}
                            title="View Substage Script"
                        >
                            View Substage Script
                        </button>
                    </div>
                    <div className="flex items-center">
                        {onCloseMobileNav && (
                           <button onClick={onCloseMobileNav} className="p-2 text-brand-gray hover:text-white md:hidden">
                                <CloseIcon className="w-5 h-5" />
                           </button>
                        )}
                        <button onClick={onToggleCollapse} className="p-2 rounded-md text-brand-light-gray hover:bg-gray-700 transition-colors hidden md:block" title="Collapse Sidebar">
                            <ChevronDoubleLeftIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 mt-4 space-y-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700">
                {/* Content Input */}
                <section className="space-y-2">
                     <button onClick={() => setIsModalOpen(true)} className="w-full flex items-center justify-center bg-brand-dark hover:bg-gray-700 border border-gray-600 text-sm p-2 rounded-md transition-colors">
                        <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
                        Add/Browse Source Content
                    </button>
                </section>
                
                {/* Processing */}
                <section className="bg-brand-dark p-3 rounded-lg border border-gray-700 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-sm font-medium text-brand-gray shrink-0">Source Content:</label>
                         {selectedContent ? (
                            <div className="flex items-center space-x-2 min-w-0">
                                <span className="text-sm text-white truncate" title={selectedContent.name}>{selectedContent.name}</span>
                                <span className={`px-1.5 py-0.5 text-xs rounded-full shrink-0 ${isProcessed ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                                    {isProcessed ? "Processed" : "Not Processed"}
                                </span>
                            </div>
                        ) : <span className="text-sm text-gray-500">None</span>}
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="output-name" className="text-sm font-medium text-brand-gray">Processed Content Name:</label>
                        <input 
                           id="output-name"
                           type="text"
                           value={outputName}
                           onChange={(e) => setOutputName(e.target.value)}
                           onFocus={handleInteractionAttempt}
                           placeholder="e.g., Key Q&A for Intro"
                           className="w-full bg-gray-800 border border-gray-600 rounded-md p-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-red"
                        />
                    </div>

                     <div className="space-y-1">
                        <label htmlFor="process-type" className="text-sm font-medium text-brand-gray">Process Type:</label>
                         <select 
                            id="process-type"
                            value={processType}
                            onMouseDown={(e) => {
                                if (handleInteractionAttempt()) {
                                    e.preventDefault();
                                    (e.target as HTMLSelectElement).blur();
                                }
                            }}
                            onChange={(e) => setProcessType(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md p-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-red"
                         >
                           {PROCESS_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                     </div>
                      {processType === 'Upload N8N JSON' && (
                        <button
                            onClick={() => {
                                if (handleInteractionAttempt()) return;
                                setIsUploadN8NModalOpen(true);
                            }}
                            className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-500 transition-all"
                        >
                            Upload N8N JSON
                        </button>
                    )}
                     <button 
                        onClick={handleProcess} 
                        className={`w-full text-white font-bold py-2 rounded transition-all ${processType === 'Upload N8N JSON' ? 'bg-gray-600 cursor-not-allowed opacity-50' : 'bg-brand-red hover:bg-opacity-80'}`}
                     >
                        Process Content
                    </button>
                </section>
                
                {/* Select Output */}
                 <section className="bg-brand-dark p-3 rounded-lg border border-gray-700 space-y-2">
                    <div>
                        <label className="text-sm font-medium text-brand-gray block mb-1">Current Processed Content:</label>
                        <div className="p-2 bg-gray-800 rounded-md min-h-[40px] flex items-center">
                            <span className="text-white text-sm font-semibold truncate">{selectedOutput ? selectedOutput.name : 'None Selected'}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsSelectOutputModalOpen(true)}
                        className="w-full bg-gray-600 text-white font-bold py-2 rounded hover:bg-gray-500 transition-colors text-sm"
                    >
                        Select Processed Content
                    </button>
                </section>
                
                {/* Output */}
                {selectedOutput && (
                    <section className="space-y-3">
                        <h3 className="text-lg font-semibold text-white">Viewing: {selectedOutput.name}</h3>
                        <div>
                            <label htmlFor="output-set" className="text-sm font-medium text-brand-gray mb-1 block">View Output Set:</label>
                            <select id="output-set" className="w-full bg-gray-800 border border-gray-600 rounded-md p-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-red">
                                {OUTPUT_SETS.map(set => <option key={set}>{set}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto p-2 border border-gray-700 rounded-md bg-brand-dark">
                            {MOCK_QAS.map(qa => (
                                <div key={qa.id} className="bg-gray-800 p-2 rounded text-sm">
                                    <p className="font-semibold text-brand-light-gray">Q: {qa.q}</p>
                                    <p className="text-brand-gray mt-1">A: {qa.a}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default ContentProcessingNav;