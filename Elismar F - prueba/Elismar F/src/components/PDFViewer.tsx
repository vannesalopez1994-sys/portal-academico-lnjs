import React from 'react';
import { X, ExternalLink } from 'lucide-react';

interface PDFViewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
}

export default function PDFViewer({ isOpen, onClose, fileUrl, fileName }: PDFViewerProps) {
  if (!isOpen) return null;

  const handleOpenInNewTab = () => {
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{fileName}</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenInNewTab}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Abrir en nueva pestaña"
            >
              <ExternalLink className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <iframe
            src={fileUrl}
            className="w-full h-full min-h-[600px]"
            title={fileName}
          />
        </div>
      </div>
    </div>
  );
}
