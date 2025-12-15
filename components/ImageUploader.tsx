import React, { ChangeEvent, useEffect } from 'react';
import { Upload, X, FileText, FileSpreadsheet } from 'lucide-react';
import { UploadFile } from '../types';

interface ImageUploaderProps {
  files: UploadFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadFile[]>>;
  disabled: boolean;
}

// Safe ID generator that works in non-secure contexts
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {
      // Fallback if it fails
    }
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const ImageUploader: React.FC<ImageUploaderProps> = ({ files, setFiles, disabled }) => {
  // Handle Paste Event
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (disabled) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      const newFiles: UploadFile[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            let fileType: 'image' | 'word' | 'excel' | null = null;

            // Determine file type
            if (file.type.startsWith('image/')) {
              fileType = 'image';
            } else if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
              fileType = 'word';
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
              fileType = 'excel';
            }

            if (fileType) {
              newFiles.push({
                id: generateId(),
                file: file,
                preview: fileType === 'image' ? URL.createObjectURL(file) : '',
                fileType: fileType
              });
            }
          }
        }
      }

      if (newFiles.length > 0) {
        setFiles((prev) => [...prev, ...newFiles]);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [disabled, setFiles]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: UploadFile[] = Array.from(e.target.files).map((file: File) => {
        let fileType: 'image' | 'word' | 'excel' = 'image';
        if (file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
          fileType = 'word';
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          fileType = 'excel';
        }

        return {
          id: generateId(),
          file: file,
          preview: fileType === 'image' ? URL.createObjectURL(file) : '',
          fileType: fileType
        };
      });
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const renderPreview = (file: UploadFile) => {
    if (file.fileType === 'image') {
      return (
        <img
          src={file.preview}
          alt="Preview"
          className="w-full h-full object-cover"
        />
      );
    }
    
    if (file.fileType === 'word') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-blue-50 text-blue-600 p-2">
           <FileText className="w-10 h-10 mb-2" />
           <span className="text-xs text-center font-medium line-clamp-2">{file.file.name}</span>
        </div>
      );
    }

    if (file.fileType === 'excel') {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-green-50 text-green-600 p-2">
           <FileSpreadsheet className="w-10 h-10 mb-2" />
           <span className="text-xs text-center font-medium line-clamp-2">{file.file.name}</span>
        </div>
      );
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors relative group bg-white">
        <input
          type="file"
          multiple
          accept="image/*,.docx,.doc,.xlsx,.xls"
          onChange={handleFileChange}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="bg-blue-50 p-4 rounded-full">
            <Upload className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-medium text-slate-700">Click to upload files or <span className="text-blue-600">Paste (Ctrl+V)</span></p>
            <p className="text-sm text-slate-500">Supports Images, Word (.docx) & Excel (.xlsx)</p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {files.map((file) => (
            <div key={file.id} className="relative group rounded-lg overflow-hidden border border-slate-200 shadow-sm aspect-square bg-white">
              {renderPreview(file)}
              {!disabled && (
                <button
                  onClick={() => removeFile(file.id)}
                  className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white p-1.5 rounded-full transition-colors backdrop-blur-sm opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              {file.fileType === 'image' && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate px-2">
                  {file.file.name}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};