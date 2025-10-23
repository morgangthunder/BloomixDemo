import React, { useState } from 'react';
import { CloseIcon, PlusCircleIcon } from './Icon';

interface AddTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (content: { name: string; type: 'file' }) => void;
}

const commonLabelClasses = "block text-sm font-medium text-brand-gray mb-1";
const commonInputClasses = "w-full bg-brand-black border border-gray-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-red";

const AddTextModal: React.FC<AddTextModalProps> = ({ isOpen, onClose, onAdd }) => {
    const [textName, setTextName] = useState('');
    const [textContent, setTextContent] = useState('');

    const handleAdd = () => {
        if (!textName.trim() || !textContent.trim()) {
            alert("Please provide a name and some text content.");
            return;
        }
        onAdd({
            name: `${textName.trim()}.txt`,
            type: 'file', // Treat text snippets as files
        });
    };

    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60]" onClick={onClose}>
            <div className="bg-brand-dark rounded-lg shadow-xl w-full max-w-lg flex flex-col p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-white">Add Text as Source Content</h2>
                    <button onClick={onClose} className="text-brand-gray hover:text-white transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="text-name" className={commonLabelClasses}>Name</label>
                        <input
                          id="text-name"
                          type="text"
                          value={textName}
                          onChange={e => setTextName(e.target.value)}
                          className={commonInputClasses}
                          placeholder="e.g., Key Quotes, Chapter 1 Notes"
                        />
                    </div>
                    <div>
                        <label htmlFor="text-content" className={commonLabelClasses}>Content</label>
                        <textarea
                            id="text-content"
                            value={textContent}
                            onChange={(e) => setTextContent(e.target.value)}
                            placeholder="Paste text directly here..."
                            className={`${commonInputClasses} h-40 resize-none`}
                        />
                    </div>
                </div>
                <div className="flex justify-end pt-6">
                    <button
                        onClick={handleAdd}
                        disabled={!textName.trim() || !textContent.trim()}
                        className="w-full flex items-center justify-center bg-brand-red text-white font-bold py-2 rounded hover:bg-opacity-80 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        <PlusCircleIcon className="w-5 h-5 mr-2" />
                        Add Text
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddTextModal;
