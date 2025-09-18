import React from 'react';
import { CloseIcon, DocumentTextIcon, LinkIcon } from './Icon';

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
  if (!isOpen) return null;

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
          <h2 className="text-2xl font-bold text-white">Browse Content</h2>
          <button onClick={onClose} className="text-brand-gray hover:text-white transition-colors">
            <CloseIcon className="w-6 h-6" />
          </button>
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
  );
};

export default ContentBrowserModal;
