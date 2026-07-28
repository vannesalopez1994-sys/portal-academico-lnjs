import React from 'react';
import { X, ExternalLink, Download, FileText, Image as ImageIcon } from 'lucide-react';

interface PDFViewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
}

export default function PDFViewer({ isOpen, onClose, fileUrl, fileName }: PDFViewerProps) {
  if (!isOpen) return null;

  const isImage = /\.(jpg|jpeg|png|webp|gif|bmp)($|\?)/i.test(fileUrl) ||
    fileUrl.includes('/imagenes_sistema/') ||
    fileUrl.toLowerCase().includes('image');

  const handleOpenInNewTab = () => {
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'documento';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden border border-slate-100 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Encabezado Corporativo Premium */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-r from-[#0a1628] via-[#0d2b5e] to-blue-900 text-white shadow-md shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/10 shrink-0">
              {isImage ? (
                <ImageIcon className="w-5 h-5 text-blue-200" />
              ) : (
                <FileText className="w-5 h-5 text-blue-200" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold truncate text-white tracking-tight" title={fileName}>
                {fileName}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-blue-200/70 font-medium">
                {isImage ? 'Vista previa de imagen' : 'Vista previa de reporte / documento PDF'}
              </p>
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition text-xs font-bold border border-white/15"
              title="Descargar archivo"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Descargar PDF</span>
            </button>
            <button
              onClick={handleOpenInNewTab}
              className="p-2 hover:bg-white/15 text-white/90 rounded-xl transition"
              title="Abrir en nueva pestaña"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-red-500/80 text-white rounded-xl transition ml-1"
              title="Cerrar visor"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contenido del Visor */}
        <div className="flex-1 bg-slate-900 p-2 sm:p-4 flex items-center justify-center w-full h-full overflow-hidden">
          {isImage ? (
            <div className="relative max-w-full max-h-full flex items-center justify-center overflow-auto">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-[78vh] object-contain rounded-xl shadow-2xl border border-white/10"
              />
            </div>
          ) : (
            <iframe
              src={fileUrl}
              className="w-full h-full rounded-xl bg-white border-0 shadow-inner"
              title={fileName}
            />
          )}
        </div>
      </div>
    </div>
  );
}
