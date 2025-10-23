import React from 'react';
import { CloseIcon } from './Icon';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-brand-dark rounded-lg shadow-xl w-full max-w-md flex flex-col p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-brand-gray hover:text-white transition-colors">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-brand-light-gray mb-6">{message}</p>

        <div className="flex justify-end space-x-4">
          <button onClick={onClose} className="bg-gray-600 text-white font-bold py-2 px-4 rounded hover:bg-gray-500 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-500 transition-colors">
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;