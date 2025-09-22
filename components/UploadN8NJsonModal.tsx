import React, { useState } from 'react';
import { CloseIcon } from './Icon';

interface UploadN8NJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (json: string) => void;
}

const UploadN8NJsonModal: React.FC<UploadN8NJsonModalProps> = ({ isOpen, onClose, onSave }) => {
  const [jsonContent, setJsonContent] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(jsonContent);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]" onClick={onClose}>
      <div className="bg-brand-dark rounded-lg shadow-xl w-full max-w-2xl flex flex-col p-6 h-[70vh]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-2xl font-bold text-white">Paste N8N JSON</h2>
          <button onClick={onClose} className="text-brand-gray hover:text-white transition-colors">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 flex flex-col">
            <label htmlFor="n8n-json" className="text-brand-gray mb-2">Paste your N8N workflow JSON below:</label>
            <textarea
                id="n8n-json"
                value={jsonContent}
                onChange={(e) => setJsonContent(e.target.value)}
                placeholder='{ "nodes": [...], "connections": [...] }'
                className="w-full flex-1 bg-brand-black border border-gray-600 rounded-md p-4 text-white font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-red"
                spellCheck="false"
            />
        </div>
        <div className="flex justify-end pt-4 mt-4 border-t border-gray-700 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={!jsonContent.trim()}
            className="bg-brand-red text-white font-bold py-2 px-6 rounded hover:bg-opacity-80 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Save JSON
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadN8NJsonModal;
