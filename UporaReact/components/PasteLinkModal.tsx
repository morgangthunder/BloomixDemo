import React, { useState } from 'react';
import { CloseIcon, PlusCircleIcon } from './Icon';

interface PasteLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (content: { name: string; type: 'link' }) => void;
}

const commonLabelClasses = "block text-sm font-medium text-brand-gray mb-1";
const commonInputClasses = "w-full bg-brand-black border border-gray-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-red";

const PasteLinkModal: React.FC<PasteLinkModalProps> = ({ isOpen, onClose, onAdd }) => {
    const [linkUrl, setLinkUrl] = useState('');
    const [linkName, setLinkName] = useState('');

    const handleAdd = () => {
        if (!linkUrl.trim()) {
            alert("Please provide a URL.");
            return;
        }
        // Use the provided name or default to the URL itself
        const name = linkName.trim() || linkUrl.trim();
        onAdd({ name, type: 'link' });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60]" onClick={onClose}>
            <div className="bg-brand-dark rounded-lg shadow-xl w-full max-w-lg flex flex-col p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-white">Add Link as Source Content</h2>
                    <button onClick={onClose} className="text-brand-gray hover:text-white transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="link-url" className={commonLabelClasses}>URL</label>
                        <input
                          id="link-url"
                          type="url"
                          value={linkUrl}
                          onChange={e => setLinkUrl(e.target.value)}
                          className={commonInputClasses}
                          placeholder="https://example.com"
                        />
                    </div>
                    <div>
                        <label htmlFor="link-name" className={commonLabelClasses}>Name (Optional)</label>
                        <input
                          id="link-name"
                          type="text"
                          value={linkName}
                          onChange={e => setLinkName(e.target.value)}
                          className={commonInputClasses}
                          placeholder="e.g., Wikipedia Article on Rhetoric"
                        />
                    </div>
                </div>
                <div className="flex justify-end pt-6">
                     <button
                        onClick={handleAdd}
                        disabled={!linkUrl.trim()}
                        className="w-full flex items-center justify-center bg-brand-red text-white font-bold py-2 rounded hover:bg-opacity-80 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        <PlusCircleIcon className="w-5 h-5 mr-2" />
                        Add Link
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PasteLinkModal;
