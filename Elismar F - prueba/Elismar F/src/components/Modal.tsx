import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning',
  loading = false,
}) => {
  if (!isOpen) return null;

  const colors = {
    danger: 'bg-red-500 hover:bg-red-600',
    warning: 'bg-orange-500 hover:bg-orange-600',
    info: 'bg-blue-500 hover:bg-blue-600',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 transform transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <div className={`p-2 rounded-full ${type === 'danger' ? 'bg-red-100' : type === 'warning' ? 'bg-orange-100' : 'bg-blue-100'} mr-3`}>
              <AlertTriangle className={`w-6 h-6 ${type === 'danger' ? 'text-red-600' : type === 'warning' ? 'text-orange-600' : 'text-blue-600'}`} />
            </div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-gray-600 mb-6 ml-14">{message}</p>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2.5 rounded-lg text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${colors[type]}`}
          >
            {loading ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
