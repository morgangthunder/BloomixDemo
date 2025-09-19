import React, { useState } from 'react';
import { CloseIcon, DocumentTextIcon, LinkIcon, UploadIcon, PlusCircleIcon } from './Icon';
import AddTextModal from './AddTextModal';
import PasteLinkModal from './PasteLinkModal';


interface ContentBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (content: { name: string; type: 'file' | 'link' }) => void;
}

const MOCK_CONTENT = [
    { id: 1, name: "Public Speaking 101.pdf", type: 'file' as const },
    { id: 2, name: "https://www.youtube.com/watch?v=1", type: 'link' as const },
    { id: 3, name: "Stage Fright Research.docx", type: 'file' as const },
    { id: 4, name: "https://en.wikipedia.org/wiki/Rhetoric", type: 'link' as const },
    { id: 5, name: "Presentation Slides.pptx", type: 'file' as const },
];

const ContentBrowserModal: React.FC<ContentBrowserModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [isAddTextModalOpen, setIsAddTextModalOpen] = useState(false);
    const [isPasteLinkModalOpen, setIsPasteLinkModalOpen] = useState(false);

    const handleAddNewContent = (content: { name: string; type: 'file' | 'link' }) => {
        // In a real app, this would add the new content to the MOCK_CONTENT list
        // and update a central state. For this demo, we just select the new item.
        onSelect(content);
        // Close all modals
        setIsAddTextModalOpen(false);
        setIsPasteLinkModalOpen(false);
        onClose();
    };


    if (!isOpen) return null;

  return (
    <>
        <AddTextModal 
            isOpen={isAddTextModalOpen}
            onClose={() => setIsAddTextModalOpen(false)}
            onAdd={handleAddNewContent}
        />
        <PasteLinkModal 
            isOpen={isPasteLinkModalOpen}
            onClose={() => setIsPasteLinkModalOpen(false)}
            onAdd={handleAddNewContent}
        />
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
            onClick={onClose}
        >
          <div 
            className="bg-brand-dark rounded-lg shadow-xl w-full max-w-2xl h-[85vh] md:h-[75vh] flex flex-col p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex-shrink-0 flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white">Add/Browse Source Content</h2>
              <button onClick={onClose} className="text-brand-gray hover:text-white transition-colors">
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>
    
            <div className="flex-shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <button className="flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-sm p-2 rounded-md transition-colors"><UploadIcon className="w-4 h-4 mr-2" /> Upload File</button>
                <button onClick={() => setIsPasteLinkModalOpen(true)} className="flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-sm p-2 rounded-md transition-colors"><LinkIcon className="w-4 h-4 mr-2" /> Paste Link</button>
                <button onClick={() => setIsAddTextModalOpen(true)} className="flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-sm p-2 rounded-md transition-colors"><PlusCircleIcon className="w-4 h-4 mr-2" /> Add Text</button>
            </div>
    
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                <div className="space-y-2">
                    {MOCK_CONTENT.map(item => (
                        <button 
                            key={item.id}
                            onClick={() => onSelect(item)}
                            className="w-full flex items-center text-left p-3 bg-brand-black rounded-md hover:bg-gray-800 transition-colors"
                        >
                            {item.type === 'file' 
                                ? <DocumentTextIcon className="w-5 h-5 mr-3 text-blue-400 flex-shrink-0"/>
                                : <LinkIcon className="w-5 h-5 mr-3 text-green-400 flex-shrink-0"/>
                            }
                            <span className="text-brand-light-gray truncate">{item.name}</span>
                        </button>
                    ))}
                </div>
            </div>
          </div>
        </div>
    </>
  );
};

export default ContentBrowserModal;