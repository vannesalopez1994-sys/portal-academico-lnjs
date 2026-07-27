import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  maxSize?: number;
  accept?: string;
  disabled?: boolean;
}

export default function FileUpload({
  onFileSelect,
  maxSize = 5 * 1024 * 1024,
  accept = '.pdf, .jpg, .jpeg, .png, .webp',
  disabled = false
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    setError(null);

    const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);

    if (!isPdf && !isImage) {
      setError('Solo se permiten archivos PDF o Imágenes (JPG, PNG, WebP)');
      return false;
    }

    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      setError(`El archivo excede el tamaño máximo de ${maxSizeMB}MB`);
      return false;
    }

    return true;
  };

  const handleFile = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isSelectedImage = selectedFile && selectedFile.type.startsWith('image/');

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />

      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all
          ${isDragging ? 'border-blue-500 bg-blue-50/80 shadow-md scale-[1.01]' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50/50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${error ? 'border-red-300 bg-red-50/60' : ''}
        `}
      >
        {selectedFile ? (
          <div className="flex items-center justify-between bg-white rounded-xl p-3.5 border border-gray-200 shadow-sm">
            <div className="flex items-center space-x-3 min-w-0">
              <div className={`p-2.5 rounded-lg shrink-0 ${isSelectedImage ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                {isSelectedImage ? <ImageIcon className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
              </div>
              <div className="text-left min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-400 font-semibold">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile();
                }}
                className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-red-500 rounded-lg transition-colors ml-2"
                title="Quitar archivo"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-800 font-bold text-sm">
                Arrastra tu justificativo (PDF o Imagen) aquí
              </p>
              <p className="text-xs text-gray-400 mt-1">
                o haz clic para examinar tus archivos
              </p>
            </div>
            <p className="text-[11px] font-semibold text-blue-600/70 bg-blue-50/60 py-1 px-3 rounded-full inline-block">
              PDF, JPG, PNG, WebP · Máximo {maxSize / (1024 * 1024)}MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
