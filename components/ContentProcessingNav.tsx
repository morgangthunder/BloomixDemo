import React, { useState } from 'react';
import { ArrowLeftIcon, ChevronDoubleLeftIcon, PlusCircleIcon, LinkIcon, UploadIcon, DocumentDuplicateIcon, CloseIcon } from './Icon';
import ContentBrowserModal from './ContentBrowserModal';

interface ContentProcessingNavProps {
    onExit: () => void;
    onToggleCollapse: () => void;
    onCloseMobileNav?: () => void;
    onProcessedContentChange: (content: { id: number; name: string } | null) => void;
}

const MOCK_QAS = [
    { id: 1, q: "What is glossophobia?", a: "Glossophobia, or the fear of public speaking, is a common social phobia characterized by anxiety when speaking in front of an audience." },
    { id: 2, q: "What is the 'Power of Three' in public speaking?", a: "The 'Power of Three' is a writing principle suggesting that things that come in threes are inherently more humorous, satisfying, or effective than other numbers of things." },
    { id: 3, q: "Why is knowing your audience important?", a: "Understanding your audience helps you tailor your message, tone, and content to be more relatable, engaging, and persuasive, increasing the effectiveness of your speech." },
];

const PROCESS_TYPES = [
    "Vectorize", "Extract Key Facts", "Extract Key Q&A Pairs", "Summarize Sections",
    "Chunk Content", "Identify Concepts & Skills", "Generate Interaction Prompts",
    "Annotate Entities", "Extract Multimedia Elements", "Classify Difficulty",
];

const OUTPUT_SETS = ["Key Q&A Pairs", "Section Summaries", "Concept Map Data"];

const ContentProcessingNav: React.FC<ContentProcessingNavProps> = ({ onExit, onToggleCollapse, onCloseMobileNav, onProcessedContentChange }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedContent, setSelectedContent] = useState<{name: string, type: 'file' | 'link'} | null>(null);
    const [isProcessed, setIsProcessed] = useState(false);
    const [processType, setProcessType] = useState(PROCESS_TYPES[2]); // Default to Q&A
    const [outputName, setOutputName] = useState('');

    const handleSelectContent = (content: {name: string, type: 'file' | 'link'}) => {
        setSelectedContent(content);
        setIsProcessed(false);
        setOutputName(''); // Reset name on new content selection
        onProcessedContentChange(null); // Clear processed content on new selection
        setIsModalOpen(false);
    }
    
    const handleProcess = () => {
        if (!outputName.trim()) {
            alert("Please provide a name for the processed content.");
            return;
        }
        setIsProcessed(true);
        // In a real app, the ID would come from the backend.
        const newContentOutput = { id: Date.now(), name: outputName.trim() };
        onProcessedContentChange(newContentOutput);
    };
    
    return (
        <div className="h-full flex flex-col p-4 overflow-hidden">
            <ContentBrowserModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSelect={handleSelectContent}
            />
            <div className="flex-shrink-0 pb-4 border-b border-gray-700">
                <button onClick={onExit} className="flex items-center text-sm text-brand-gray hover:text-white transition-colors mb-4">
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Back to Hub
                </button>
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Source Content Processing</h2>
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
                    <div className="flex items-center space-x-2">
                        <button className="flex-1 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-sm p-2 rounded-md transition-colors"><UploadIcon className="w-4 h-4 mr-2" /> Upload</button>
                        <button className="flex-1 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-sm p-2 rounded-md transition-colors"><LinkIcon className="w-4 h-4 mr-2" /> Paste Link</button>
                    </div>
                     <button onClick={() => setIsModalOpen(true)} className="w-full flex items-center justify-center bg-brand-dark hover:bg-gray-700 border border-gray-600 text-sm p-2 rounded-md transition-colors">
                        <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
                        Add/Browse Source Content
                    </button>
                </section>
                
                {/* Processing */}
                <section className="bg-brand-dark p-3 rounded-lg border border-gray-700 space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-sm font-medium text-brand-gray">Selected:</label>
                        {selectedContent ? (
                            <div className="flex items-center space-x-2">
                                <span className="text-sm text-white truncate">{selectedContent.name}</span>
                                <span className={`px-1.5 py-0.5 text-xs rounded-full ${isProcessed ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
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
                           placeholder="e.g., Key Q&A for Intro"
                           className="w-full bg-gray-800 border border-gray-600 rounded-md p-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-red" 
                           disabled={!selectedContent}
                        />
                    </div>

                     <div className="space-y-1">
                        <label htmlFor="process-type" className="text-sm font-medium text-brand-gray">Process Type:</label>
                         <select 
                            id="process-type"
                            value={processType}
                            onChange={(e) => setProcessType(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-600 rounded-md p-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-red"
                            disabled={!selectedContent}>
                           {PROCESS_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                     </div>
                     <button onClick={handleProcess} disabled={!selectedContent} className="w-full bg-brand-red text-white font-bold py-2 rounded hover:bg-opacity-80 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed">
                        Process Content
                    </button>
                </section>
                
                {/* Output */}
                {isProcessed && (
                    <section className="space-y-3">
                        <h3 className="text-lg font-semibold text-white">Output</h3>
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